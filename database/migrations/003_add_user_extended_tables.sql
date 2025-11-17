-- Migration: Create user_profiles and user_oauth tables
-- Date: 2025-11-17
-- Description: Tách OAuth và profile data ra khỏi bảng users để giữ schema tối giản
--
-- DESIGN PHILOSOPHY:
-- - Bảng `users` chỉ chứa thông tin Discord cơ bản (discord_id, username)
-- - Bảng `user_profiles` chứa thông tin mở rộng (avatar, email, integrations)
-- - Bảng `user_oauth` chứa OAuth tokens và authorization status
--
-- LỢI ÍCH:
-- - ✅ Separation of concerns - mỗi bảng có 1 nhiệm vụ rõ ràng
-- - ✅ Bảng users nhỏ gọn, query nhanh hơn
-- - ✅ OAuth tokens được cách ly, bảo mật tốt hơn
-- - ✅ Dễ thêm/xóa features mà không ảnh hưởng bảng chính
-- - ✅ Follow database normalization best practices

BEGIN;

-- ==========================================
-- 1. TẠO BẢNG USER_PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Discord extended info
  discriminator VARCHAR(10),                   -- Discord discriminator (#1234)
  avatar VARCHAR(100),                         -- Discord avatar hash
  email VARCHAR(255),                          -- Email (from OAuth scope)

  -- Integrations
  pterodactyl_user_id INTEGER,                 -- Pterodactyl panel user ID (nếu có)

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes cho performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Trigger tự động update timestamp
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. TẠO BẢNG USER_OAUTH
-- ==========================================
CREATE TABLE IF NOT EXISTS user_oauth (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Authorization status
  is_authorized BOOLEAN DEFAULT false,         -- Đã authorize chưa?
  scopes TEXT,                                 -- Granted scopes (space-separated)

  -- OAuth2 tokens (nên encrypt trong production)
  access_token TEXT,                           -- OAuth2 access token
  refresh_token TEXT,                          -- OAuth2 refresh token
  token_expires_at TIMESTAMP,                  -- Token expiration time

  -- Compliance
  terms_accepted_at TIMESTAMP,                 -- Thời điểm chấp nhận điều khoản

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes cho authorization checks
CREATE INDEX IF NOT EXISTS idx_user_oauth_is_authorized ON user_oauth(is_authorized);
CREATE INDEX IF NOT EXISTS idx_user_oauth_token_expires_at ON user_oauth(token_expires_at);

-- Trigger tự động update timestamp
CREATE TRIGGER update_user_oauth_updated_at BEFORE UPDATE ON user_oauth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. MIGRATE DỮ LIỆU CŨ (NẾU CÓ)
-- ==========================================
-- Nếu bạn đã có data trong users table với các cột cũ,
-- uncomment phần này để migrate data:

/*
-- Migrate từ cột cũ sang user_profiles
INSERT INTO user_profiles (user_id, discriminator, avatar, email, pterodactyl_user_id)
SELECT id, discriminator, avatar, email, pterodactyl_user_id
FROM users
WHERE discriminator IS NOT NULL OR avatar IS NOT NULL OR email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Migrate từ cột cũ sang user_oauth
INSERT INTO user_oauth (user_id, is_authorized, scopes, access_token, refresh_token, token_expires_at, terms_accepted_at)
SELECT id, is_authorized, oauth_scopes, oauth_access_token, oauth_refresh_token, oauth_token_expires_at, terms_accepted_at
FROM users
WHERE is_authorized = true OR oauth_access_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Xóa các cột cũ khỏi users table (CẢNH BÁO: Không thể undo!)
ALTER TABLE users
  DROP COLUMN IF EXISTS discriminator,
  DROP COLUMN IF EXISTS avatar,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS is_authorized,
  DROP COLUMN IF EXISTS oauth_access_token,
  DROP COLUMN IF EXISTS oauth_refresh_token,
  DROP COLUMN IF EXISTS oauth_token_expires_at,
  DROP COLUMN IF EXISTS oauth_scopes,
  DROP COLUMN IF EXISTS terms_accepted_at,
  DROP COLUMN IF EXISTS pterodactyl_user_id;
*/

-- ==========================================
-- 4. VERIFY SCHEMA
-- ==========================================
-- Kiểm tra cấu trúc bảng mới
SELECT 'users table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT 'user_profiles table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

SELECT 'user_oauth table:' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_oauth'
ORDER BY ordinal_position;

COMMIT;

-- ==========================================
-- NOTES
-- ==========================================
-- Sau khi run migration này, bạn cần update code để:
--
-- 1. Khi query user data, JOIN với user_profiles và user_oauth:
--    SELECT u.*, up.email, uo.is_authorized
--    FROM users u
--    LEFT JOIN user_profiles up ON u.id = up.user_id
--    LEFT JOIN user_oauth uo ON u.id = uo.user_id
--    WHERE u.discord_id = $1
--
-- 2. Khi insert/update user data:
--    -- Insert vào users trước
--    INSERT INTO users (discord_id, username) VALUES ($1, $2)
--    RETURNING id;
--
--    -- Sau đó insert vào user_profiles
--    INSERT INTO user_profiles (user_id, email, avatar, discriminator)
--    VALUES ($1, $2, $3, $4)
--    ON CONFLICT (user_id) DO UPDATE SET ...
--
--    -- Và user_oauth
--    INSERT INTO user_oauth (user_id, is_authorized, access_token, ...)
--    VALUES ($1, $2, $3, ...)
--    ON CONFLICT (user_id) DO UPDATE SET ...
