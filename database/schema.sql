-- ==========================================
-- WhiteCat Hosting Bot - Schema Database
-- PostgreSQL 12+
-- Phiên bản: 4.0 - Hỗ trợ đa tiền tệ
-- ==========================================
--
-- Mô tả:
--   Schema database cho WhiteCat Discord hosting bot với hỗ trợ đa tiền tệ.
--   Quản lý người dùng, kinh tế, hosting server, giao dịch và Discord guilds.
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
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS user_hosting CASCADE;
DROP TABLE IF EXISTS ports CASCADE;
DROP TABLE IF EXISTS hosting_pricing CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_economy CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS server_nodes CASCADE;

-- @create

-- ==========================================
-- 1. BẢNG USERS (Người dùng)
-- ==========================================
-- Lưu thông tin người dùng Discord và dữ liệu OAuth2
-- Mỗi user có thể ủy quyền bot truy cập tài khoản Discord
-- và liên kết với Pterodactyl panel để quản lý server
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,

  -- Thông tin Discord
  discord_id VARCHAR(20) UNIQUE NOT NULL,     -- Discord user ID (snowflake)
  username VARCHAR(100) NOT NULL,              -- Tên người dùng Discord
  discriminator VARCHAR(10),                   -- Discriminator Discord (#0000)
  avatar VARCHAR(255),                         -- Hash avatar Discord
  email VARCHAR(255),                          -- Email người dùng (cần OAuth scope)

  -- Tích hợp Pterodactyl
  pterodactyl_user_id INTEGER,                 -- ID người dùng trên Pterodactyl

  -- Ủy quyền OAuth2
  is_authorized BOOLEAN DEFAULT false,         -- User đã ủy quyền bot chưa?
  oauth_access_token TEXT,                     -- OAuth2 access token (mã hóa)
  oauth_refresh_token TEXT,                    -- OAuth2 refresh token (mã hóa)
  oauth_token_expires_at TIMESTAMP,            -- Thời điểm access token hết hạn
  oauth_scopes TEXT,                           -- Các quyền đã cấp (identify,email,...)
  terms_accepted_at TIMESTAMP,                 -- Thời điểm chấp nhận điều khoản

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm kiếm nhanh
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_pterodactyl_user_id ON users(pterodactyl_user_id);

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
  guild_name VARCHAR(255) NOT NULL,            -- Tên guild
  owner_id VARCHAR(20),                        -- Discord ID của chủ server
  prefix VARCHAR(10) DEFAULT '!',              -- Prefix cho lệnh text
  locale VARCHAR(10) DEFAULT 'en',             -- Ngôn ngữ: 'en', 'vi'
  member_count INTEGER DEFAULT 0,              -- Số lượng thành viên
  icon VARCHAR(255),                           -- Icon hash của guild

  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,                           -- Thời điểm bot rời khỏi guild
  is_active BOOLEAN DEFAULT true,              -- Bot còn trong guild không?
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  --   'purchase'        - Mua hosting/items
  --   'transfer_send'   - Gửi tiền cho người khác
  --   'transfer_receive'- Nhận tiền từ người khác
  --   'refund'          - Hoàn tiền từ dịch vụ bị hủy
  --   'admin_grant'     - Admin cho tiền
  --   'daily'           - Nhận thưởng hàng ngày
  --   'work'            - Nhận thưởng từ lệnh work
  type VARCHAR(50) NOT NULL,

  -- Số tiền giao dịch
  amount BIGINT NOT NULL,                      -- Số tiền chuyển (dương hoặc âm)
  balance_before BIGINT NOT NULL,              -- Số dư trước giao dịch
  balance_after BIGINT NOT NULL,               -- Số dư sau giao dịch

  -- Các thực thể liên quan
  related_user_id BIGINT REFERENCES users(id), -- Với transfer: người dùng bên kia
  related_hosting_id BIGINT,                   -- Với mua hàng: dịch vụ hosting

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
-- 6. BẢNG SERVER NODES (Node Server Vật Lý)
-- ==========================================
-- Quản lý các node server vật lý để hosting
-- Mỗi node có thể chứa nhiều game server
CREATE TABLE IF NOT EXISTS server_nodes (
  id SERIAL PRIMARY KEY,

  name VARCHAR(100) NOT NULL UNIQUE,           -- Tên node: 'Node-US-1'
  location VARCHAR(100) NOT NULL,              -- Vị trí: 'United States, Dallas'
  pterodactyl_id INTEGER,                      -- ID node trên Pterodactyl

  is_active BOOLEAN DEFAULT true,              -- Node có đang hoạt động không?
  max_servers INTEGER DEFAULT 100,             -- Số server tối đa trên node này
  current_servers INTEGER DEFAULT 0,           -- Số server hiện tại

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_server_nodes_is_active ON server_nodes(is_active);

-- ==========================================
-- 7. BẢNG HOSTING PRICING (Bảng Giá Hosting)
-- ==========================================
-- Định nghĩa giá cho các tài nguyên server
-- User có thể tùy chỉnh lượng RAM, CPU và storage
CREATE TABLE IF NOT EXISTS hosting_pricing (
  id SERIAL PRIMARY KEY,

  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ram', 'cpu', 'storage')),
  amount INTEGER NOT NULL,                     -- Số lượng tính bằng MB/millicores/GB
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  price BIGINT NOT NULL,                       -- Giá mỗi tháng
  description VARCHAR(255),                    -- Mô tả hiển thị
  display_order INTEGER DEFAULT 0,             -- Thứ tự hiển thị trên UI

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_type, amount)
);

CREATE INDEX idx_hosting_pricing_resource ON hosting_pricing(resource_type);

-- Bảng giá mặc định (tính bằng COIN)
INSERT INTO hosting_pricing (resource_type, amount, price, description, display_order) VALUES
-- RAM (tính bằng MB)
('ram', 512, 5000, '512 MB RAM', 1),
('ram', 1024, 9000, '1 GB RAM', 2),
('ram', 2048, 17000, '2 GB RAM', 3),
('ram', 4096, 33000, '4 GB RAM', 4),
('ram', 8192, 65000, '8 GB RAM', 5),

-- CPU (tính bằng millicores: 100 = 1 core)
('cpu', 50, 2000, '0.5 Core CPU', 1),
('cpu', 100, 3500, '1 Core CPU', 2),
('cpu', 200, 6500, '2 Cores CPU', 3),
('cpu', 400, 12500, '4 Cores CPU', 4),

-- Storage (tính bằng GB)
('storage', 5, 2000, '5 GB Storage', 1),
('storage', 10, 3500, '10 GB Storage', 2),
('storage', 20, 6500, '20 GB Storage', 3),
('storage', 50, 15000, '50 GB Storage', 4),
('storage', 100, 28000, '100 GB Storage', 5)
ON CONFLICT (resource_type, amount) DO NOTHING;

-- ==========================================
-- 8. BẢNG PORTS (Cổng Mạng)
-- ==========================================
-- Quản lý các cổng có sẵn cho game server
-- Mỗi server cần một cổng riêng
CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,

  port INTEGER UNIQUE NOT NULL,                -- Số cổng (25565, 25566, v.v.)
  is_in_use BOOLEAN DEFAULT false,             -- Cổng đang được dùng không?
  reserved_for BIGINT,                         -- Dành riêng cho dịch vụ hosting nào?

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ports_is_in_use ON ports(is_in_use);

-- ==========================================
-- 9. BẢNG USER HOSTING (Server Của User)
-- ==========================================
-- Theo dõi các game server thuộc sở hữu của user
-- Liên kết với Pterodactyl để quản lý server thực tế
CREATE TABLE IF NOT EXISTS user_hosting (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  server_name VARCHAR(100) NOT NULL,           -- Tên server do user đặt

  -- Phân bổ tài nguyên
  ram_mb INTEGER NOT NULL,                     -- RAM tính bằng MB
  cpu_cores INTEGER NOT NULL,                  -- CPU tính bằng millicores (100 = 1 core)
  storage_gb INTEGER NOT NULL,                 -- Storage tính bằng GB

  -- Phân công
  port_id INTEGER REFERENCES ports(id),        -- Cổng được gán
  node_id INTEGER REFERENCES server_nodes(id), -- Node nào host server này

  -- Tích hợp Pterodactyl
  pterodactyl_server_id VARCHAR(50),           -- UUID server trên Pterodactyl
  server_identifier VARCHAR(8),                -- Identifier ngắn (8 ký tự)

  -- Thanh toán
  monthly_cost BIGINT NOT NULL,                -- Chi phí mỗi tháng (tính bằng coins)
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  auto_renew BOOLEAN DEFAULT false,            -- Tự động gia hạn khi hết hạn?

  -- Trạng thái server
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
  expires_at TIMESTAMP NOT NULL,               -- Thời điểm dịch vụ hết hạn

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspended_at TIMESTAMP,                      -- Thời điểm bị tạm ngưng (nếu có)
  cancelled_at TIMESTAMP                       -- Thời điểm bị hủy (nếu có)
);

-- Index cho các query thường dùng
CREATE INDEX idx_user_hosting_user_id ON user_hosting(user_id);
CREATE INDEX idx_user_hosting_status ON user_hosting(status);
CREATE INDEX idx_user_hosting_expires_at ON user_hosting(expires_at);

-- Thêm foreign key constraints sau khi tạo bảng
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_related_hosting
  FOREIGN KEY (related_hosting_id) REFERENCES user_hosting(id) ON DELETE SET NULL;

ALTER TABLE ports
  ADD CONSTRAINT fk_ports_reserved_for
  FOREIGN KEY (reserved_for) REFERENCES user_hosting(id) ON DELETE SET NULL;

-- ==========================================
-- 10. BẢNG WEBHOOKS (Webhook Discord)
-- ==========================================
-- Lưu URL webhook Discord để gửi thông báo
-- Gửi tin nhắn tự động cho các sự kiện
CREATE TABLE IF NOT EXISTS webhooks (
  id BIGSERIAL PRIMARY KEY,

  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,                   -- URL webhook Discord

  -- Các loại sự kiện:
  --   'payment'         - Thông báo thanh toán
  --   'hosting_expiry'  - Server sắp hết hạn
  --   'hosting_create'  - Tạo server mới
  event_type VARCHAR(50) NOT NULL,

  is_active BOOLEAN DEFAULT true,              -- Webhook có được bật không?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_guild_id ON webhooks(guild_id);
CREATE INDEX idx_webhooks_event_type ON webhooks(event_type);

-- ==========================================
-- 11. BẢNG GIVEAWAYS (Phần Quà/Thi)
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
  min_account_age_days INTEGER,                -- Tuổi tài khoản Discord tối thiểu

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
-- 12. BẢNG GIVEAWAY ENTRIES (Người Tham Gia)
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
-- 13. BẢNG STATISTICS (Thống Kê)
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
-- 14. BẢNG COMMAND LOGS (Nhật Ký Lệnh)
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

CREATE TRIGGER update_user_hosting_updated_at BEFORE UPDATE ON user_hosting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- KẾT THÚC SCHEMA
-- ==========================================
