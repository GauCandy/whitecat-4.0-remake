-- ==========================================
-- Migration: Auto-Response System
-- Phiên bản: 4.0.4
-- ==========================================
--
-- Mô tả:
--   Thêm các bảng cho hệ thống auto-response dựa trên keyword
--   - auto_responses: Lưu từ khóa và phản hồi
--   - auto_response_blocked_channels: Lưu các kênh bị chặn
--   - web_sessions: Lưu Discord OAuth sessions
--
-- ==========================================

-- ==========================================
-- 10. BẢNG AUTO_RESPONSES (Phản hồi tự động)
-- ==========================================
-- Lưu các từ khóa và phản hồi tương ứng cho mỗi guild
CREATE TABLE IF NOT EXISTS auto_responses (
  id BIGSERIAL PRIMARY KEY,

  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,

  -- Từ khóa trigger
  keyword VARCHAR(100) NOT NULL,              -- Từ khóa kích hoạt (không phân biệt hoa thường)

  -- Phản hồi
  response TEXT NOT NULL,                     -- Nội dung phản hồi

  -- Cấu hình
  match_type VARCHAR(20) DEFAULT 'contains',  -- 'exact', 'contains', 'startswith', 'endswith'
  is_case_sensitive BOOLEAN DEFAULT false,    -- Có phân biệt hoa thường không?
  is_enabled BOOLEAN DEFAULT true,            -- Có hoạt động không?

  -- Metadata
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Mỗi keyword chỉ được định nghĩa một lần trong mỗi guild
  UNIQUE(guild_id, keyword)
);

CREATE INDEX idx_auto_responses_guild_id ON auto_responses(guild_id);
CREATE INDEX idx_auto_responses_keyword ON auto_responses(keyword);
CREATE INDEX idx_auto_responses_enabled ON auto_responses(is_enabled);

-- ==========================================
-- 11. BẢNG AUTO_RESPONSE_BLOCKED_CHANNELS
-- ==========================================
-- Lưu các kênh bị chặn không cho phép auto-response
CREATE TABLE IF NOT EXISTS auto_response_blocked_channels (
  id BIGSERIAL PRIMARY KEY,

  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id VARCHAR(20) NOT NULL,            -- Discord channel ID

  -- Metadata
  blocked_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Mỗi kênh chỉ được chặn một lần trong mỗi guild
  UNIQUE(guild_id, channel_id)
);

CREATE INDEX idx_blocked_channels_guild_id ON auto_response_blocked_channels(guild_id);
CREATE INDEX idx_blocked_channels_channel_id ON auto_response_blocked_channels(channel_id);

-- ==========================================
-- 12. BẢNG WEB_SESSIONS (Phiên đăng nhập Discord OAuth)
-- ==========================================
-- Lưu session cho web dashboard (đăng nhập qua Discord OAuth)
CREATE TABLE IF NOT EXISTS web_sessions (
  id BIGSERIAL PRIMARY KEY,

  -- Discord user info
  discord_id VARCHAR(20) NOT NULL,            -- Discord user ID
  discord_username VARCHAR(100),              -- Discord username
  discord_avatar VARCHAR(255),                -- Avatar hash

  -- OAuth tokens
  access_token TEXT NOT NULL,                 -- Discord access token
  refresh_token TEXT,                         -- Discord refresh token
  token_expires_at TIMESTAMP,                 -- Token expiration

  -- Session
  session_token VARCHAR(255) UNIQUE NOT NULL,

  -- Thông tin phiên
  ip_address VARCHAR(45),                     -- IPv4 hoặc IPv6
  user_agent TEXT,

  -- Thời gian
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_web_sessions_token ON web_sessions(session_token);
CREATE INDEX idx_web_sessions_discord_id ON web_sessions(discord_id);
CREATE INDEX idx_web_sessions_expires ON web_sessions(expires_at);

-- Trigger cập nhật updated_at
CREATE TRIGGER update_auto_responses_updated_at BEFORE UPDATE ON auto_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- KẾT THÚC MIGRATION
-- ==========================================
