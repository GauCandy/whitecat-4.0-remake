-- ============================================
-- WhiteCat Database Schema - Simplified
-- ============================================

-- @create

-- ============================================
-- CORE: USER & AUTH
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  discriminator VARCHAR(4),
  avatar VARCHAR(255),
  email VARCHAR(255),

  -- OAuth (for website login)
  access_token TEXT,
  refresh_token TEXT,
  oauth_level VARCHAR(10) DEFAULT 'none' CHECK (oauth_level IN ('none', 'basic', 'advanced')),
  oauth_expires_at TIMESTAMP,

  -- Settings
  locale VARCHAR(5) DEFAULT 'en',

  -- Ban info
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_banned ON users(is_banned);

-- ============================================
-- ECONOMY SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_economy (
  user_id VARCHAR(20) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Currencies
  coins BIGINT DEFAULT 0 CHECK (coins >= 0),
  points BIGINT DEFAULT 0 CHECK (points >= 0),
  premium BIGINT DEFAULT 0 CHECK (premium >= 0),

  -- Daily/Weekly rewards
  daily_streak INTEGER DEFAULT 0,
  last_daily TIMESTAMP,
  weekly_streak INTEGER DEFAULT 0,
  last_weekly TIMESTAMP,

  -- Stats
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction log (optional - có thể disable nếu không cần)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'transfer', 'purchase', 'admin')),
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('coins', 'points', 'premium')),
  amount BIGINT NOT NULL,

  -- For transfers
  target_user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,

  description TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);

-- ============================================
-- DISCORD GUILDS
-- ============================================

CREATE TABLE IF NOT EXISTS guilds (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255),
  owner_id VARCHAR(20),

  -- Bot settings
  locale VARCHAR(5) DEFAULT 'en',
  prefix VARCHAR(10) DEFAULT '!',
  settings JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guilds_active ON guilds(is_active);

-- ============================================
-- HOSTING SYSTEM (custom config, user chọn)
-- ============================================

-- Resource pricing (giá cho từng option)
CREATE TABLE IF NOT EXISTS hosting_pricing (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ram', 'cpu', 'storage')),
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  price_per_month BIGINT NOT NULL,
  display_order INTEGER DEFAULT 0,

  UNIQUE(resource_type, value)
);

-- Insert default pricing
INSERT INTO hosting_pricing (resource_type, value, unit, price_per_month, display_order) VALUES
  -- RAM options
  ('ram', 512, 'MB', 10000, 1),
  ('ram', 1024, 'MB', 20000, 2),
  ('ram', 2048, 'MB', 40000, 3),
  ('ram', 4096, 'MB', 80000, 4),
  ('ram', 8192, 'MB', 150000, 5),

  -- CPU options
  ('cpu', 0.5, 'core', 5000, 1),
  ('cpu', 1.0, 'core', 10000, 2),
  ('cpu', 2.0, 'core', 20000, 3),
  ('cpu', 3.0, 'core', 35000, 4),
  ('cpu', 4.0, 'core', 50000, 5),

  -- Storage options
  ('storage', 5, 'GB', 5000, 1),
  ('storage', 10, 'GB', 10000, 2),
  ('storage', 20, 'GB', 20000, 3),
  ('storage', 40, 'GB', 35000, 4),
  ('storage', 80, 'GB', 60000, 5)
ON CONFLICT (resource_type, value) DO NOTHING;

-- User's hosting instances (custom config)
CREATE TABLE IF NOT EXISTS user_hosting (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Instance info
  name VARCHAR(100) NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,

  -- User-selected configuration
  ram_mb INTEGER NOT NULL,
  cpu_cores DECIMAL(3,2) NOT NULL,
  storage_gb INTEGER NOT NULL,

  -- Pricing (saved at purchase time)
  price_per_month BIGINT NOT NULL,
  paid_coins BIGINT NOT NULL,
  paid_premium BIGINT DEFAULT 0,

  -- Status
  status VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  auto_renew BOOLEAN DEFAULT FALSE,

  -- Dates
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  renewed_count INTEGER DEFAULT 0,

  -- Extra config
  metadata JSONB
);

CREATE INDEX idx_hosting_user ON user_hosting(user_id);
CREATE INDEX idx_hosting_status ON user_hosting(status);
CREATE INDEX idx_hosting_expires ON user_hosting(expires_at);

-- Port pool
CREATE TABLE IF NOT EXISTS ports (
  port INTEGER PRIMARY KEY,
  is_used BOOLEAN DEFAULT FALSE,
  hosting_id INTEGER REFERENCES user_hosting(id) ON DELETE SET NULL
);

CREATE INDEX idx_ports_available ON ports(is_used) WHERE is_used = FALSE;

-- ============================================
-- REVERSE PROXY (for hosting)
-- ============================================

CREATE TABLE IF NOT EXISTS reverse_proxy (
  id SERIAL PRIMARY KEY,
  hosting_id INTEGER NOT NULL REFERENCES user_hosting(id) ON DELETE CASCADE,

  domain VARCHAR(255) NOT NULL UNIQUE,
  target_port INTEGER NOT NULL,

  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_expires_at TIMESTAMP,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proxy_hosting ON reverse_proxy(hosting_id);

-- ============================================
-- WEBHOOKS (optional feature)
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),

  events TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,

  last_triggered TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);

-- ============================================
-- GIVEAWAYS
-- ============================================

CREATE TABLE IF NOT EXISTS giveaways (
  id SERIAL PRIMARY KEY,

  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) UNIQUE,

  prize TEXT NOT NULL,
  winners_count INTEGER DEFAULT 1 CHECK (winners_count > 0),

  -- Requirements (NULL = no requirement)
  min_role_id VARCHAR(20),
  min_level INTEGER,
  min_coins BIGINT,

  status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),

  ends_at TIMESTAMP NOT NULL,
  created_by VARCHAR(20) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_giveaways_guild ON giveaways(guild_id);
CREATE INDEX idx_giveaways_status ON giveaways(status, ends_at);

-- Participants
CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (giveaway_id, user_id)
);

CREATE INDEX idx_entries_giveaway ON giveaway_entries(giveaway_id);

-- Winners
CREATE TABLE IF NOT EXISTS giveaway_winners (
  giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  won_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (giveaway_id, user_id)
);

-- ============================================
-- STATISTICS (optional)
-- ============================================

CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,

  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_guilds INTEGER DEFAULT 0,

  commands_run INTEGER DEFAULT 0,

  coins_earned BIGINT DEFAULT 0,
  coins_spent BIGINT DEFAULT 0,

  active_hosting INTEGER DEFAULT 0,
  revenue_coins BIGINT DEFAULT 0,
  revenue_premium BIGINT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command usage (lightweight)
CREATE TABLE IF NOT EXISTS command_logs (
  id SERIAL PRIMARY KEY,

  command VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
  guild_id VARCHAR(20),

  success BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_command ON command_logs(command, created_at DESC);
CREATE INDEX idx_logs_created ON command_logs(created_at DESC);

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER user_economy_updated BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER guilds_updated BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get available port
CREATE OR REPLACE FUNCTION get_available_port()
RETURNS INTEGER AS $$
DECLARE
  available_port INTEGER;
BEGIN
  SELECT port INTO available_port
  FROM ports
  WHERE is_used = FALSE
  LIMIT 1;

  RETURN available_port;
END;
$$ LANGUAGE plpgsql;

-- Mark port as used
CREATE OR REPLACE FUNCTION use_port(p_port INTEGER, p_hosting_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE ports
  SET is_used = TRUE, hosting_id = p_hosting_id
  WHERE port = p_port;
END;
$$ LANGUAGE plpgsql;

-- Release port
CREATE OR REPLACE FUNCTION release_port(p_port INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE ports
  SET is_used = FALSE, hosting_id = NULL
  WHERE port = p_port;
END;
$$ LANGUAGE plpgsql;

-- @drop

-- Drop tables in correct order
DROP TABLE IF EXISTS command_logs CASCADE;
DROP TABLE IF EXISTS daily_stats CASCADE;
DROP TABLE IF EXISTS giveaway_winners CASCADE;
DROP TABLE IF EXISTS giveaway_entries CASCADE;
DROP TABLE IF EXISTS giveaways CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS reverse_proxy CASCADE;
DROP TABLE IF EXISTS ports CASCADE;
DROP TABLE IF EXISTS user_hosting CASCADE;
DROP TABLE IF EXISTS hosting_pricing CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_economy CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_available_port() CASCADE;
DROP FUNCTION IF EXISTS use_port(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS release_port(INTEGER) CASCADE;
