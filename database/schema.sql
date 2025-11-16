-- ==========================================
-- WhiteCat Hosting Bot Database Schema
-- PostgreSQL 12+
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
  email VARCHAR(255), -- User email (only if email scope authorized)

  -- OAuth2 Authorization
  is_authorized BOOLEAN DEFAULT false,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMP,
  oauth_scopes TEXT, -- comma-separated: identify,applications.commands,email
  terms_accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_discord_id ON users(discord_id);

-- ==========================================
-- 2. USER ECONOMY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_economy (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  coins BIGINT DEFAULT 0,
  daily_last_claimed TIMESTAMP,
  work_last_claimed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_user_economy_user_id ON user_economy(user_id);

-- ==========================================
-- 3. GUILDS TABLE
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
-- 4. TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'earn', 'spend', 'transfer', 'refund'
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ==========================================
-- 5. SERVER NODES TABLE
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

-- ==========================================
-- 6. HOSTING PRICING TABLE (Custom Configuration)
-- ==========================================
CREATE TABLE IF NOT EXISTS hosting_pricing (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ram', 'cpu', 'storage')),
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  price_per_month BIGINT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_type, value)
);

CREATE INDEX idx_hosting_pricing_resource ON hosting_pricing(resource_type);

-- Default pricing data
INSERT INTO hosting_pricing (resource_type, value, unit, price_per_month, display_order) VALUES
-- RAM options
('ram', 512, 'MB', 5000, 1),
('ram', 1024, 'MB', 10000, 2),
('ram', 2048, 'MB', 18000, 3),
('ram', 4096, 'MB', 32000, 4),
('ram', 8192, 'MB', 60000, 5),

-- CPU options
('cpu', 0.5, 'cores', 3000, 1),
('cpu', 1, 'cores', 6000, 2),
('cpu', 2, 'cores', 11000, 3),
('cpu', 3, 'cores', 16000, 4),
('cpu', 4, 'cores', 20000, 5),

-- Storage options
('storage', 5, 'GB', 2000, 1),
('storage', 10, 'GB', 4000, 2),
('storage', 20, 'GB', 7000, 3),
('storage', 40, 'GB', 13000, 4),
('storage', 80, 'GB', 24000, 5)
ON CONFLICT (resource_type, value) DO NOTHING;

-- ==========================================
-- 7. PORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,
  port INTEGER UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  reserved_for BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ports_is_used ON ports(is_used);

-- ==========================================
-- 8. USER HOSTING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_hosting (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  server_name VARCHAR(100) NOT NULL,

  -- Custom configuration
  ram_mb INTEGER NOT NULL,
  cpu_cores DECIMAL(3,1) NOT NULL,
  storage_gb INTEGER NOT NULL,

  -- Port assignment
  port INTEGER REFERENCES ports(port) ON DELETE SET NULL,

  -- Node assignment
  node_id INTEGER REFERENCES server_nodes(id) ON DELETE SET NULL,

  -- Pterodactyl integration
  pterodactyl_server_id VARCHAR(50),
  pterodactyl_identifier VARCHAR(50),

  -- Billing
  monthly_cost BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),

  -- Auto-renew
  auto_renew BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suspended_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_user_hosting_user_id ON user_hosting(user_id);
CREATE INDEX idx_user_hosting_status ON user_hosting(status);
CREATE INDEX idx_user_hosting_expires_at ON user_hosting(expires_at);

-- ==========================================
-- 9. WEBHOOKS TABLE
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
-- 10. GIVEAWAYS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS giveaways (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) UNIQUE NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER DEFAULT 1,
  ends_at TIMESTAMP NOT NULL,
  ended BOOLEAN DEFAULT false,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_giveaways_guild_id ON giveaways(guild_id);
CREATE INDEX idx_giveaways_ended ON giveaways(ended);
CREATE INDEX idx_giveaways_ends_at ON giveaways(ends_at);

-- ==========================================
-- 11. GIVEAWAY ENTRIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id BIGSERIAL PRIMARY KEY,
  giveaway_id BIGINT REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(giveaway_id, user_id)
);

CREATE INDEX idx_giveaway_entries_giveaway_id ON giveaway_entries(giveaway_id);
CREATE INDEX idx_giveaway_entries_user_id ON giveaway_entries(user_id);

-- ==========================================
-- 12. STATISTICS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS statistics (
  id BIGSERIAL PRIMARY KEY,
  stat_key VARCHAR(100) UNIQUE NOT NULL,
  stat_value BIGINT DEFAULT 0,
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 13. COMMAND LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS command_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE SET NULL,
  command_name VARCHAR(100) NOT NULL,
  options JSONB,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER, -- milliseconds
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX idx_command_logs_guild_id ON command_logs(guild_id);
CREATE INDEX idx_command_logs_command_name ON command_logs(command_name);
CREATE INDEX idx_command_logs_executed_at ON command_logs(executed_at DESC);

-- ==========================================
-- FOREIGN KEY CONSTRAINTS (Added after table creation)
-- ==========================================

-- Add foreign key for ports.reserved_for -> user_hosting.id
ALTER TABLE ports
  ADD CONSTRAINT fk_ports_reserved_for
  FOREIGN KEY (reserved_for)
  REFERENCES user_hosting(id)
  ON DELETE SET NULL;

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_economy_updated_at BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_hosting_updated_at BEFORE UPDATE ON user_hosting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert default statistics
INSERT INTO statistics (stat_key, stat_value) VALUES
('total_users', 0),
('total_servers', 0),
('total_transactions', 0),
('total_coins_circulating', 0)
ON CONFLICT (stat_key) DO NOTHING;
