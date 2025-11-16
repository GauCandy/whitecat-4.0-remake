-- WhiteCat Hosting Bot 4.0 - Database Schema
-- PostgreSQL Database Schema
-- Author: GauCandy
-- Version: 4.0

-- =====================================================
-- @create
-- =====================================================

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(32) NOT NULL,
  discriminator VARCHAR(4) NOT NULL,
  avatar VARCHAR(255),
  email VARCHAR(255),

  -- Pterodactyl Integration
  pterodactyl_user_id INTEGER,

  -- OAuth2 Authorization
  is_authorized BOOLEAN DEFAULT FALSE,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMP,
  oauth_scopes TEXT,

  -- Terms & Timestamps
  terms_accepted_at TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_pterodactyl_user_id ON users(pterodactyl_user_id);

-- =====================================================
-- 2. USER ECONOMY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_economy (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  coins BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_economy_user_id ON user_economy(user_id);

-- =====================================================
-- 3. GUILDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS guilds (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) UNIQUE NOT NULL,
  guild_name VARCHAR(100) NOT NULL,
  prefix VARCHAR(5) DEFAULT '!' NOT NULL,
  locale VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id);

-- =====================================================
-- 4. SERVER NODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS server_nodes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_servers INTEGER DEFAULT 100,
  current_servers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_server_nodes_is_active ON server_nodes(is_active);

-- =====================================================
-- 5. HOSTING PRICING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS hosting_pricing (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(20) NOT NULL, -- 'ram', 'cpu', 'storage'
  amount INTEGER NOT NULL, -- Amount in MB/cores/GB
  price BIGINT NOT NULL, -- Price in coins
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_type, amount)
);

CREATE INDEX IF NOT EXISTS idx_hosting_pricing_resource_type ON hosting_pricing(resource_type);

-- Default pricing data
INSERT INTO hosting_pricing (resource_type, amount, price, description) VALUES
  -- RAM Pricing (per MB)
  ('ram', 512, 5000, '512 MB RAM'),
  ('ram', 1024, 9000, '1 GB RAM'),
  ('ram', 2048, 17000, '2 GB RAM'),
  ('ram', 4096, 33000, '4 GB RAM'),
  ('ram', 8192, 65000, '8 GB RAM'),

  -- CPU Pricing (per core, in millicores: 100 = 0.1 core)
  ('cpu', 50, 2000, '0.5 Core CPU'),
  ('cpu', 100, 3500, '1 Core CPU'),
  ('cpu', 200, 6500, '2 Cores CPU'),
  ('cpu', 400, 12500, '4 Cores CPU'),

  -- Storage Pricing (per GB)
  ('storage', 5, 2000, '5 GB Storage'),
  ('storage', 10, 3500, '10 GB Storage'),
  ('storage', 20, 6500, '20 GB Storage'),
  ('storage', 50, 15000, '50 GB Storage'),
  ('storage', 100, 28000, '100 GB Storage')
ON CONFLICT (resource_type, amount) DO NOTHING;

-- =====================================================
-- 6. PORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,
  port INTEGER UNIQUE NOT NULL,
  is_in_use BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ports_is_in_use ON ports(is_in_use);

-- =====================================================
-- 7. USER HOSTING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_hosting (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  server_node_id INTEGER REFERENCES server_nodes(id),
  port_id INTEGER REFERENCES ports(id),

  -- Server Resources
  server_name VARCHAR(100) NOT NULL,
  ram_mb INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL, -- Stored in millicores (100 = 1 core)
  storage_gb INTEGER NOT NULL,

  -- Pterodactyl Server Info
  pterodactyl_server_id INTEGER,
  server_identifier VARCHAR(8),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_hosting_user_id ON user_hosting(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hosting_is_active ON user_hosting(is_active);
CREATE INDEX IF NOT EXISTS idx_user_hosting_expires_at ON user_hosting(expires_at);

-- =====================================================
-- 8. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction Type
  type VARCHAR(50) NOT NULL, -- 'purchase', 'transfer_send', 'transfer_receive', 'refund', 'admin_grant'

  -- Transaction Details
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,

  -- Related Data
  related_user_id INTEGER REFERENCES users(id), -- For transfers
  related_hosting_id INTEGER REFERENCES user_hosting(id), -- For purchases
  description TEXT,
  metadata JSONB, -- Extra data in JSON format

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- =====================================================
-- 9. WEBHOOKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) REFERENCES guilds(guild_id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'server_created', 'server_expired', 'payment_received'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_guild_id ON webhooks(guild_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);

-- =====================================================
-- 10. GIVEAWAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS giveaways (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) UNIQUE NOT NULL,

  -- Giveaway Details
  prize TEXT NOT NULL,
  winner_count INTEGER DEFAULT 1,
  host_user_id VARCHAR(20) NOT NULL,

  -- Requirements
  required_role_id VARCHAR(20),
  min_account_age_days INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  ends_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_giveaways_guild_id ON giveaways(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_is_active ON giveaways(is_active);
CREATE INDEX IF NOT EXISTS idx_giveaways_ends_at ON giveaways(ends_at);

-- =====================================================
-- 11. GIVEAWAY ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id SERIAL PRIMARY KEY,
  giveaway_id INTEGER REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id VARCHAR(20) NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(giveaway_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_giveaway_entries_giveaway_id ON giveaway_entries(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user_id ON giveaway_entries(user_id);

-- =====================================================
-- 12. STATISTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS statistics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) UNIQUE NOT NULL,
  metric_value BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default statistics
INSERT INTO statistics (metric_name, metric_value) VALUES
  ('total_users', 0),
  ('total_servers', 0),
  ('total_transactions', 0),
  ('total_coins_in_circulation', 0),
  ('total_commands_executed', 0)
ON CONFLICT (metric_name) DO NOTHING;

-- =====================================================
-- 13. COMMAND LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS command_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  command_name VARCHAR(100) NOT NULL,
  command_type VARCHAR(20) NOT NULL, -- 'slash', 'text'
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_command_name ON command_logs(command_name);
CREATE INDEX IF NOT EXISTS idx_command_logs_created_at ON command_logs(created_at);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_economy_updated_at BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_server_nodes_updated_at BEFORE UPDATE ON server_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_hosting_updated_at BEFORE UPDATE ON user_hosting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- @drop
-- =====================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_user_economy_updated_at ON user_economy;
DROP TRIGGER IF EXISTS update_guilds_updated_at ON guilds;
DROP TRIGGER IF EXISTS update_server_nodes_updated_at ON server_nodes;
DROP TRIGGER IF EXISTS update_user_hosting_updated_at ON user_hosting;
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
DROP TRIGGER IF EXISTS update_statistics_updated_at ON statistics;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all tables in reverse order (respect foreign keys)
DROP TABLE IF EXISTS command_logs CASCADE;
DROP TABLE IF EXISTS statistics CASCADE;
DROP TABLE IF EXISTS giveaway_entries CASCADE;
DROP TABLE IF EXISTS giveaways CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_hosting CASCADE;
DROP TABLE IF EXISTS ports CASCADE;
DROP TABLE IF EXISTS hosting_pricing CASCADE;
DROP TABLE IF EXISTS server_nodes CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS user_economy CASCADE;
DROP TABLE IF EXISTS users CASCADE;
