-- ==========================================
-- WhiteCat Hosting Bot Database Schema
-- PostgreSQL 12+
-- Version: 4.0 - Multi-Currency Support
-- ==========================================

-- @drop
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
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  discord_id VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  discriminator VARCHAR(10),
  avatar VARCHAR(255),
  email VARCHAR(255),

  -- Pterodactyl Integration
  pterodactyl_user_id INTEGER,

  -- OAuth2 Authorization
  is_authorized BOOLEAN DEFAULT false,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMP,
  oauth_scopes TEXT,
  terms_accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_pterodactyl_user_id ON users(pterodactyl_user_id);

-- ==========================================
-- 2. CURRENCIES TABLE (Multi-Currency Support)
-- ==========================================
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL, -- 'VND', 'USD', 'COIN', etc.
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10) NOT NULL, -- '₫', '$', '🪙'
  is_default BOOLEAN DEFAULT false,
  exchange_rate DECIMAL(10,4) DEFAULT 1.0, -- Rate to default currency
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default currencies
INSERT INTO currencies (code, name, symbol, is_default, exchange_rate, is_active) VALUES
('COIN', 'WhiteCat Coins', '🪙', true, 1.0, true),
('VND', 'Vietnamese Dong', '₫', false, 1.0, false)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 3. USER ECONOMY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_economy (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  balance BIGINT DEFAULT 0,

  -- Optional: Daily/Work claims for gamification
  daily_last_claimed TIMESTAMP,
  work_last_claimed TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, currency_id)
);

CREATE INDEX idx_user_economy_user_id ON user_economy(user_id);
CREATE INDEX idx_user_economy_currency_id ON user_economy(currency_id);

-- ==========================================
-- 4. GUILDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS guilds (
  id BIGSERIAL PRIMARY KEY,
  guild_id VARCHAR(20) UNIQUE NOT NULL,
  guild_name VARCHAR(255) NOT NULL,
  prefix VARCHAR(10) DEFAULT '!',
  locale VARCHAR(10) DEFAULT 'en',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_guilds_guild_id ON guilds(guild_id);

-- ==========================================
-- 5. TRANSACTIONS TABLE (Multi-Currency)
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,

  -- Transaction Type: 'purchase', 'transfer_send', 'transfer_receive', 'refund', 'admin_grant', 'daily', 'work'
  type VARCHAR(50) NOT NULL,

  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,

  -- Related entities
  related_user_id BIGINT REFERENCES users(id),
  related_hosting_id BIGINT, -- Will FK to user_hosting after creation

  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_currency_id ON transactions(currency_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ==========================================
-- 6. SERVER NODES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS server_nodes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(100) NOT NULL,
  pterodactyl_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  max_servers INTEGER DEFAULT 100,
  current_servers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_server_nodes_is_active ON server_nodes(is_active);

-- ==========================================
-- 7. HOSTING PRICING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS hosting_pricing (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ram', 'cpu', 'storage')),
  amount INTEGER NOT NULL, -- Amount in MB/millicores/GB
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  price BIGINT NOT NULL,
  description VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_type, amount)
);

CREATE INDEX idx_hosting_pricing_resource ON hosting_pricing(resource_type);

-- Default pricing (in COIN currency)
INSERT INTO hosting_pricing (resource_type, amount, price, description, display_order) VALUES
-- RAM (MB)
('ram', 512, 5000, '512 MB RAM', 1),
('ram', 1024, 9000, '1 GB RAM', 2),
('ram', 2048, 17000, '2 GB RAM', 3),
('ram', 4096, 33000, '4 GB RAM', 4),
('ram', 8192, 65000, '8 GB RAM', 5),

-- CPU (millicores: 100 = 1 core)
('cpu', 50, 2000, '0.5 Core CPU', 1),
('cpu', 100, 3500, '1 Core CPU', 2),
('cpu', 200, 6500, '2 Cores CPU', 3),
('cpu', 400, 12500, '4 Cores CPU', 4),

-- Storage (GB)
('storage', 5, 2000, '5 GB Storage', 1),
('storage', 10, 3500, '10 GB Storage', 2),
('storage', 20, 6500, '20 GB Storage', 3),
('storage', 50, 15000, '50 GB Storage', 4),
('storage', 100, 28000, '100 GB Storage', 5)
ON CONFLICT (resource_type, amount) DO NOTHING;

-- ==========================================
-- 8. PORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,
  port INTEGER UNIQUE NOT NULL,
  is_in_use BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ports_is_in_use ON ports(is_in_use);

-- ==========================================
-- 9. USER HOSTING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_hosting (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  server_name VARCHAR(100) NOT NULL,

  -- Resources
  ram_mb INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL, -- millicores (100 = 1 core)
  storage_gb INTEGER NOT NULL,

  -- Assignments
  port_id INTEGER REFERENCES ports(id),
  node_id INTEGER REFERENCES server_nodes(id),

  -- Pterodactyl integration
  pterodactyl_server_id VARCHAR(50),
  server_identifier VARCHAR(8),

  -- Billing
  monthly_cost BIGINT NOT NULL,
  currency_id INTEGER REFERENCES currencies(id) DEFAULT 1,
  auto_renew BOOLEAN DEFAULT false,

  -- Status: 'active', 'suspended', 'cancelled', 'expired'
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
  expires_at TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspended_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_user_hosting_user_id ON user_hosting(user_id);
CREATE INDEX idx_user_hosting_status ON user_hosting(status);
CREATE INDEX idx_user_hosting_expires_at ON user_hosting(expires_at);

-- Add FK for transactions.related_hosting_id
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_related_hosting
  FOREIGN KEY (related_hosting_id) REFERENCES user_hosting(id) ON DELETE SET NULL;

-- ==========================================
-- 10. WEBHOOKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS webhooks (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'payment', 'hosting_expiry', 'hosting_create'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_guild_id ON webhooks(guild_id);
CREATE INDEX idx_webhooks_event_type ON webhooks(event_type);

-- ==========================================
-- 11. GIVEAWAYS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS giveaways (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) UNIQUE NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER DEFAULT 1,

  -- Requirements (optional)
  required_role_id VARCHAR(20),
  min_account_age_days INTEGER,

  ends_at TIMESTAMP NOT NULL,
  ended BOOLEAN DEFAULT false,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_giveaways_guild_id ON giveaways(guild_id);
CREATE INDEX idx_giveaways_ended ON giveaways(ended);
CREATE INDEX idx_giveaways_ends_at ON giveaways(ends_at);

-- ==========================================
-- 12. GIVEAWAY ENTRIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id BIGSERIAL PRIMARY KEY,
  giveaway_id BIGINT REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(giveaway_id, user_id)
);

CREATE INDEX idx_giveaway_entries_giveaway_id ON giveaway_entries(giveaway_id);

-- ==========================================
-- 13. STATISTICS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS statistics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(100) UNIQUE NOT NULL,
  metric_value BIGINT DEFAULT 0,
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO statistics (metric_name, metric_value) VALUES
('total_users', 0),
('total_servers', 0),
('total_transactions', 0),
('total_coins_circulating', 0)
ON CONFLICT (metric_name) DO NOTHING;

-- ==========================================
-- 14. COMMAND LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS command_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE SET NULL,
  command_name VARCHAR(100) NOT NULL,
  command_type VARCHAR(20) DEFAULT 'slash', -- 'slash' or 'text'
  success BOOLEAN DEFAULT true,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX idx_command_logs_command_name ON command_logs(command_name);
CREATE INDEX idx_command_logs_created_at ON command_logs(created_at DESC);

-- ==========================================
-- TRIGGERS FOR AUTO-UPDATE
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_economy_updated_at BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_hosting_updated_at BEFORE UPDATE ON user_hosting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
