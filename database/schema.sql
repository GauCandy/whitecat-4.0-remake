-- ==========================================
-- WhiteCat Bot - Schema Database
-- PostgreSQL 12+
-- Phiên bản: 4.0 - Hỗ trợ đa tiền tệ
-- ==========================================
--
-- Mô tả:
--   Schema database cho WhiteCat Discord bot với hỗ trợ đa tiền tệ.
--   Quản lý người dùng, kinh tế, giao dịch, giveaways và Discord guilds.
--
-- Tác giả: WhiteCat Team
-- Cập nhật lần cuối: 2025
-- ==========================================

-- @drop
-- Dọn dẹp các bảng cũ (theo thứ tự ngược lại để tránh lỗi foreign key)
DROP TABLE IF EXISTS command_logs CASCADE;
DROP TABLE IF EXISTS statistics CASCADE;
DROP TABLE IF EXISTS giveaway_entries CASCADE;
DROP TABLE IF EXISTS giveaways CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_economy CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- @create

-- ==========================================
-- 1. BẢNG USERS (Người dùng)
-- ==========================================
-- Lưu thông tin người dùng Discord
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,

  -- Thông tin Discord
  discord_id VARCHAR(20) UNIQUE NOT NULL,     -- Discord user ID (snowflake)
  username VARCHAR(100) NOT NULL,              -- Tên người dùng Discord

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm kiếm nhanh
CREATE INDEX idx_users_discord_id ON users(discord_id);

-- ==========================================
-- 2. BẢNG CURRENCIES (Tiền tệ)
-- ==========================================
-- Quản lý các loại tiền tệ trong hệ thống kinh tế
-- Hỗ trợ cả tiền ảo và tiền thật
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,

  code VARCHAR(10) UNIQUE NOT NULL,            -- Mã tiền tệ: 'COIN', 'VND', 'USD'
  name VARCHAR(50) NOT NULL,                   -- Tên hiển thị: 'WhiteCat Coins'
  symbol VARCHAR(10) NOT NULL,                 -- Ký hiệu: '🪙', '₫', '$'
  is_default BOOLEAN DEFAULT false,            -- Đây có phải tiền tệ mặc định?
  exchange_rate DECIMAL(10,4) DEFAULT 1.0,     -- Tỷ giá so với tiền mặc định
  is_active BOOLEAN DEFAULT true,              -- Tiền tệ này còn hoạt động không?

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm các loại tiền tệ mặc định
INSERT INTO currencies (code, name, symbol, is_default, exchange_rate, is_active) VALUES
('COIN', 'WhiteCat Coins', '🪙', true, 1.0, true),
('VND', 'Vietnamese Dong', '₫', false, 1.0, false)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 3. BẢNG USER ECONOMY (Kinh tế người dùng)
-- ==========================================
-- Theo dõi số dư của người dùng cho từng loại tiền tệ
-- Một người dùng có thể có số dư ở nhiều loại tiền khác nhau
CREATE TABLE IF NOT EXISTS user_economy (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  balance BIGINT DEFAULT 0,                    -- Số dư hiện tại (đơn vị nhỏ nhất)

  -- Gamification: Phần thưởng hàng ngày và làm việc
  daily_last_claimed TIMESTAMP,                -- Lần cuối claim daily reward
  work_last_claimed TIMESTAMP,                 -- Lần cuối dùng lệnh work

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Mỗi user chỉ có một số dư cho mỗi loại tiền
  UNIQUE(user_id, currency_id)
);

-- Index cho các query thường dùng
CREATE INDEX idx_user_economy_user_id ON user_economy(user_id);
CREATE INDEX idx_user_economy_currency_id ON user_economy(currency_id);

-- ==========================================
-- 4. BẢNG GUILDS (Server Discord)
-- ==========================================
-- Lưu cấu hình của các server Discord (guild)
-- Theo dõi cài đặt bot cho từng server
CREATE TABLE IF NOT EXISTS guilds (
  id BIGSERIAL PRIMARY KEY,

  guild_id VARCHAR(20) UNIQUE NOT NULL,        -- Discord guild ID (snowflake)
  locale VARCHAR(10) DEFAULT 'en-US',          -- Ngôn ngữ: 'en-US', 'vi', etc.
  prefix VARCHAR(10) DEFAULT '!',              -- Prefix cho lệnh text

  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP                            -- Thời điểm bot rời khỏi guild
);

CREATE INDEX idx_guilds_guild_id ON guilds(guild_id);

-- ==========================================
-- 5. BẢNG TRANSACTIONS (Giao dịch)
-- ==========================================
-- Ghi lại tất cả giao dịch kinh tế để kiểm toán
-- Hỗ trợ nhiều loại giao dịch và tiền tệ
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,

  -- Các loại giao dịch:
  --   'transfer_send'   - Gửi tiền cho người khác
  --   'transfer_receive'- Nhận tiền từ người khác
  --   'admin_grant'     - Admin cho tiền
  --   'daily'           - Nhận thưởng hàng ngày
  --   'work'            - Nhận thưởng từ lệnh work
  type VARCHAR(50) NOT NULL,

  -- Số tiền giao dịch
  amount BIGINT NOT NULL,                      -- Số tiền chuyển (dương hoặc âm)
  balance_before BIGINT NOT NULL,              -- Số dư trước giao dịch
  balance_after BIGINT NOT NULL,               -- Số dư sau giao dịch

  -- User liên quan (cho transfers)
  related_user_id BIGINT REFERENCES users(id), -- Với transfer: người dùng bên kia

  -- Thông tin thêm
  description TEXT,                            -- Mô tả dễ hiểu cho người đọc
  metadata JSONB,                              -- Dữ liệu phụ (định dạng JSON)

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index cho các query thường gặp
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ==========================================
-- 6. BẢNG GIVEAWAYS (Phần Quà/Thi)
-- ==========================================
-- Quản lý các cuộc thi/phần quà trên Discord
-- User có thể react để tham gia, chọn người thắng ngẫu nhiên
CREATE TABLE IF NOT EXISTS giveaways (
  id BIGSERIAL PRIMARY KEY,

  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id VARCHAR(20) NOT NULL,             -- Discord channel ID
  message_id VARCHAR(20) UNIQUE NOT NULL,      -- Discord message ID (để react)
  prize TEXT NOT NULL,                         -- Mô tả phần thưởng
  winner_count INTEGER DEFAULT 1,              -- Số người thắng

  -- Yêu cầu để tham gia (tùy chọn)
  required_role_id VARCHAR(20),                -- Phải có role này mới được vào

  -- Trạng thái
  ends_at TIMESTAMP NOT NULL,                  -- Thời điểm kết thúc
  ended BOOLEAN DEFAULT false,                 -- Đã kết thúc chưa?

  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_giveaways_guild_id ON giveaways(guild_id);
CREATE INDEX idx_giveaways_ended ON giveaways(ended);
CREATE INDEX idx_giveaways_ends_at ON giveaways(ends_at);

-- ==========================================
-- 7. BẢNG GIVEAWAY ENTRIES (Người Tham Gia)
-- ==========================================
-- Theo dõi ai đã tham gia giveaway nào
-- Một người chỉ được tham gia mỗi giveaway một lần
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id BIGSERIAL PRIMARY KEY,

  giveaway_id BIGINT REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ngăn tham gia trùng lặp
  UNIQUE(giveaway_id, user_id)
);

CREATE INDEX idx_giveaway_entries_giveaway_id ON giveaway_entries(giveaway_id);
CREATE INDEX idx_giveaway_entries_user_id ON giveaway_entries(user_id);

-- ==========================================
-- 8. BẢNG STATISTICS (Thống Kê)
-- ==========================================
-- Lưu thống kê toàn bot theo ngày
-- Theo dõi số liệu như servers joined/left, commands used, etc.
CREATE TABLE IF NOT EXISTS statistics (
  id BIGSERIAL PRIMARY KEY,

  stat_type VARCHAR(100) NOT NULL,             -- Loại thống kê: 'servers_joined', 'servers_left', etc.
  stat_value BIGINT DEFAULT 0,                 -- Giá trị thống kê
  date DATE DEFAULT CURRENT_DATE,              -- Ngày ghi nhận thống kê
  metadata JSONB,                              -- Dữ liệu phụ (định dạng JSON)

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Mỗi loại thống kê chỉ có một bản ghi mỗi ngày
  UNIQUE(stat_type, date)
);

CREATE INDEX idx_statistics_stat_type ON statistics(stat_type);
CREATE INDEX idx_statistics_date ON statistics(date DESC);

-- ==========================================
-- 9. BẢNG COMMAND LOGS (Nhật Ký Lệnh)
-- ==========================================
-- Ghi lại tất cả lệnh được thực thi để phân tích
-- Theo dõi thành công/thất bại, thời gian thực thi, lỗi
CREATE TABLE IF NOT EXISTS command_logs (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE SET NULL,

  command_name VARCHAR(100) NOT NULL,          -- Tên lệnh: 'balance', 'create-server'
  command_type VARCHAR(20) DEFAULT 'slash',    -- 'slash' hoặc 'text'
  success BOOLEAN DEFAULT true,                -- Lệnh có thành công không?
  execution_time_ms INTEGER,                   -- Thời gian thực thi (mili giây)
  error_message TEXT,                          -- Thông báo lỗi nếu thất bại

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index cho các query phân tích
CREATE INDEX idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX idx_command_logs_guild_id ON command_logs(guild_id);
CREATE INDEX idx_command_logs_command_name ON command_logs(command_name);
CREATE INDEX idx_command_logs_created_at ON command_logs(created_at DESC);

-- ==========================================
-- FUNCTIONS & TRIGGERS (Hàm & Trigger)
-- ==========================================

-- Tự động cập nhật timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Áp dụng trigger cho các bảng có cột updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_economy_updated_at BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- KẾT THÚC SCHEMA
-- ==========================================
