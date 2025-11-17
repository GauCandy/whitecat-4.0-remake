-- Migration: Create user_profiles and user_oauth tables
-- Date: 2025-11-17
-- Description: Tách OAuth và profile data ra khỏi bảng users - TỐI GIẢN
--
-- DESIGN PHILOSOPHY: MINIMALIST
-- - Bảng `users` chỉ chứa Discord ID + username
-- - Bảng `user_profiles` chứa thông tin mở rộng (avatar, email)
-- - Bảng `user_oauth` chỉ lưu REFRESH TOKEN (không lưu access token)
--
-- WHY ONLY REFRESH TOKEN?
-- - Access token sống 7 ngày, dùng xong bỏ, không cần lưu DB
-- - Refresh token để lấy access token mới khi cần
-- - Có refresh_token = user đã authorized

BEGIN;

-- ==========================================
-- 1. TẠO BẢNG USER_PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Discord extended info
  discriminator VARCHAR(10),
  avatar VARCHAR(100),
  email VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Trigger tự động update timestamp
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. TẠO BẢNG USER_OAUTH (MINIMALIST!)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_oauth (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Chỉ lưu refresh token (không lưu access token)
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_token_expires_at ON user_oauth(token_expires_at);

-- Trigger tự động update timestamp
CREATE TRIGGER update_user_oauth_updated_at BEFORE UPDATE ON user_oauth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
