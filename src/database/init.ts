import { Pool } from 'pg';
import { databaseConfig } from './config';

const pool = new Pool(databaseConfig);

// SQL queries for creating tables
const createTablesSQL = `
-- ============================================
-- USER & AUTH TABLES
-- ============================================

-- Main users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,  -- Discord user ID
  username VARCHAR(32) NOT NULL,
  discriminator VARCHAR(4),
  email VARCHAR(255),
  avatar VARCHAR(255),

  -- OAuth information
  access_token TEXT,
  refresh_token TEXT,
  oauth_level VARCHAR(20) DEFAULT 'none' CHECK (oauth_level IN ('none', 'basic', 'advanced')),
  oauth_expires_at TIMESTAMP,

  -- User preferences
  locale VARCHAR(10) DEFAULT 'en',

  -- Ban information
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  ban_expires_at TIMESTAMP,  -- NULL means permanent
  banned_by VARCHAR(20),  -- Admin user ID

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_oauth_level ON users(oauth_level);

-- ============================================
-- ECONOMY TABLES
-- ============================================

-- User economy/wallet
CREATE TABLE IF NOT EXISTS user_economy (
  user_id VARCHAR(20) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Currencies
  coins BIGINT DEFAULT 0 CHECK (coins >= 0),
  points BIGINT DEFAULT 0 CHECK (points >= 0),
  premium_currency BIGINT DEFAULT 0 CHECK (premium_currency >= 0),

  -- Streaks
  daily_streak INTEGER DEFAULT 0 CHECK (daily_streak >= 0),
  last_daily_claim TIMESTAMP,
  weekly_streak INTEGER DEFAULT 0 CHECK (weekly_streak >= 0),
  last_weekly_claim TIMESTAMP,

  -- Metadata
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction history
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'transfer', 'purchase', 'admin_give', 'admin_take')),
  currency_type VARCHAR(20) NOT NULL CHECK (currency_type IN ('coins', 'points', 'premium')),
  amount BIGINT NOT NULL,

  -- Transfer information (if applicable)
  target_user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,

  -- Context
  description TEXT,
  metadata JSONB,  -- For storing additional data like item purchased, etc.

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_target_user_id ON transactions(target_user_id);

-- ============================================
-- HOSTING TABLES
-- ============================================

-- Available hosting plans
CREATE TABLE IF NOT EXISTS hosting_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Specs
  ram_mb INTEGER NOT NULL,
  cpu_cores DECIMAL(3,2) NOT NULL,
  storage_gb INTEGER NOT NULL,

  -- Pricing
  price_coins BIGINT NOT NULL,
  price_premium BIGINT DEFAULT 0,

  -- Duration (in days)
  duration_days INTEGER NOT NULL DEFAULT 30,

  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's hosting instances
CREATE TABLE IF NOT EXISTS user_hosting (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES hosting_plans(id),

  -- Instance details
  instance_name VARCHAR(100) NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  contact_email VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
  auto_renew BOOLEAN DEFAULT FALSE,

  -- Dates
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  suspended_at TIMESTAMP,
  suspension_reason TEXT,

  -- Metadata
  metadata JSONB,  -- For storing additional configuration

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_hosting
CREATE INDEX IF NOT EXISTS idx_user_hosting_user_id ON user_hosting(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hosting_status ON user_hosting(status);
CREATE INDEX IF NOT EXISTS idx_user_hosting_expires_at ON user_hosting(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_hosting_port ON user_hosting(port);

-- Hosting renewal history
CREATE TABLE IF NOT EXISTS hosting_renewals (
  id SERIAL PRIMARY KEY,
  hosting_id INTEGER NOT NULL REFERENCES user_hosting(id) ON DELETE CASCADE,

  renewed_by VARCHAR(20) NOT NULL REFERENCES users(id),
  renewal_type VARCHAR(20) NOT NULL CHECK (renewal_type IN ('manual', 'auto', 'admin')),

  -- Payment details
  amount_coins BIGINT NOT NULL,
  amount_premium BIGINT DEFAULT 0,

  extended_days INTEGER NOT NULL,
  new_expiry_date TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for hosting_renewals
CREATE INDEX IF NOT EXISTS idx_hosting_renewals_hosting_id ON hosting_renewals(hosting_id);
CREATE INDEX IF NOT EXISTS idx_hosting_renewals_created_at ON hosting_renewals(created_at DESC);

-- Port management
CREATE TABLE IF NOT EXISTS available_ports (
  port INTEGER PRIMARY KEY,
  is_available BOOLEAN DEFAULT TRUE,
  reserved_for VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
  reserved_at TIMESTAMP,
  notes TEXT
);

-- ============================================
-- REVERSE PROXY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS reverse_proxy (
  id SERIAL PRIMARY KEY,
  hosting_id INTEGER NOT NULL REFERENCES user_hosting(id) ON DELETE CASCADE,

  domain VARCHAR(255) NOT NULL UNIQUE,
  target_port INTEGER NOT NULL,

  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_cert_path TEXT,
  ssl_key_path TEXT,
  ssl_expires_at TIMESTAMP,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reverse_proxy
CREATE INDEX IF NOT EXISTS idx_reverse_proxy_hosting_id ON reverse_proxy(hosting_id);
CREATE INDEX IF NOT EXISTS idx_reverse_proxy_domain ON reverse_proxy(domain);
CREATE INDEX IF NOT EXISTS idx_reverse_proxy_target_port ON reverse_proxy(target_port);

-- ============================================
-- DISCORD GUILDS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS guilds (
  id VARCHAR(20) PRIMARY KEY,  -- Discord guild ID
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255),
  owner_id VARCHAR(20),

  -- Bot settings for this guild
  locale VARCHAR(10) DEFAULT 'en',
  prefix VARCHAR(10) DEFAULT '!',

  -- Settings (stored as JSONB for flexibility)
  settings JSONB DEFAULT '{}'::jsonb,

  -- Features enabled/disabled
  features_enabled TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for guilds
CREATE INDEX IF NOT EXISTS idx_guilds_owner_id ON guilds(owner_id);
CREATE INDEX IF NOT EXISTS idx_guilds_is_active ON guilds(is_active);

-- ============================================
-- WEBHOOKS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),  -- For webhook verification

  -- Events to listen to
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  is_active BOOLEAN DEFAULT TRUE,

  -- Rate limiting
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

-- Webhook logs (for debugging)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- ============================================
-- STATISTICS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS statistics (
  id SERIAL PRIMARY KEY,

  -- Snapshot date
  snapshot_date DATE NOT NULL UNIQUE,

  -- User stats
  total_users BIGINT DEFAULT 0,
  active_users_today BIGINT DEFAULT 0,
  new_users_today BIGINT DEFAULT 0,

  -- Guild stats
  total_guilds BIGINT DEFAULT 0,
  active_guilds_today BIGINT DEFAULT 0,

  -- Command stats
  commands_executed_today BIGINT DEFAULT 0,

  -- Economy stats
  total_coins_in_circulation BIGINT DEFAULT 0,
  total_transactions_today BIGINT DEFAULT 0,

  -- Hosting stats
  active_hosting_instances BIGINT DEFAULT 0,
  revenue_coins_today BIGINT DEFAULT 0,
  revenue_premium_today BIGINT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for statistics
CREATE INDEX IF NOT EXISTS idx_statistics_snapshot_date ON statistics(snapshot_date DESC);

-- Command usage statistics (more granular)
CREATE TABLE IF NOT EXISTS command_stats (
  id SERIAL PRIMARY KEY,
  command_name VARCHAR(100) NOT NULL,
  guild_id VARCHAR(20),
  user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,

  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for command_stats
CREATE INDEX IF NOT EXISTS idx_command_stats_command_name ON command_stats(command_name);
CREATE INDEX IF NOT EXISTS idx_command_stats_executed_at ON command_stats(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_stats_guild_id ON command_stats(guild_id);

-- ============================================
-- GIVEAWAY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS giveaways (
  id SERIAL PRIMARY KEY,

  -- Discord information
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) UNIQUE,

  -- Giveaway details
  prize TEXT NOT NULL,
  description TEXT,
  winners_count INTEGER DEFAULT 1 CHECK (winners_count > 0),

  -- Requirements
  required_role_id VARCHAR(20),
  min_level INTEGER DEFAULT 0,
  min_coins BIGINT DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),

  -- Dates
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,

  -- Creator
  created_by VARCHAR(20) NOT NULL REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for giveaways
CREATE INDEX IF NOT EXISTS idx_giveaways_guild_id ON giveaways(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_status ON giveaways(status);
CREATE INDEX IF NOT EXISTS idx_giveaways_ends_at ON giveaways(ends_at);

-- Giveaway participants
CREATE TABLE IF NOT EXISTS giveaway_participants (
  id SERIAL PRIMARY KEY,
  giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(giveaway_id, user_id)  -- User can only join once per giveaway
);

-- Indexes for giveaway_participants
CREATE INDEX IF NOT EXISTS idx_giveaway_participants_giveaway_id ON giveaway_participants(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_participants_user_id ON giveaway_participants(user_id);

-- Giveaway winners
CREATE TABLE IF NOT EXISTS giveaway_winners (
  id SERIAL PRIMARY KEY,
  giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE,

  UNIQUE(giveaway_id, user_id)
);

-- Indexes for giveaway_winners
CREATE INDEX IF NOT EXISTS idx_giveaway_winners_giveaway_id ON giveaway_winners(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_winners_user_id ON giveaway_winners(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_economy_updated_at BEFORE UPDATE ON user_economy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosting_plans_updated_at BEFORE UPDATE ON hosting_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_hosting_updated_at BEFORE UPDATE ON user_hosting
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reverse_proxy_updated_at BEFORE UPDATE ON reverse_proxy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_giveaways_updated_at BEFORE UPDATE ON giveaways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// SQL query to drop all tables
const dropTablesSQL = `
-- Drop all tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS giveaway_winners CASCADE;
DROP TABLE IF EXISTS giveaway_participants CASCADE;
DROP TABLE IF EXISTS giveaways CASCADE;
DROP TABLE IF EXISTS command_stats CASCADE;
DROP TABLE IF EXISTS statistics CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;
DROP TABLE IF EXISTS reverse_proxy CASCADE;
DROP TABLE IF EXISTS available_ports CASCADE;
DROP TABLE IF EXISTS hosting_renewals CASCADE;
DROP TABLE IF EXISTS user_hosting CASCADE;
DROP TABLE IF EXISTS hosting_plans CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_economy CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
`;

// Initialize database tables
async function initDatabase() {
  console.log('🚀 Initializing database tables...\n');

  try {
    await pool.query(createTablesSQL);
    console.log('✅ All tables created successfully!');
    console.log('📊 Database schema:');
    console.log('   - users & user_economy (authentication & economy)');
    console.log('   - transactions (transaction history)');
    console.log('   - hosting_plans, user_hosting, hosting_renewals (hosting system)');
    console.log('   - available_ports (port management)');
    console.log('   - reverse_proxy (domain mapping)');
    console.log('   - guilds (Discord server settings)');
    console.log('   - webhooks & webhook_logs (webhook system)');
    console.log('   - statistics & command_stats (analytics)');
    console.log('   - giveaways, giveaway_participants, giveaway_winners (giveaway system)');
    console.log('\n✨ Database is ready to use!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Drop all database tables
async function dropDatabase() {
  console.log('⚠️  Dropping all database tables...\n');

  try {
    await pool.query(dropTablesSQL);
    console.log('✅ All tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

// Reset database (drop + init)
async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  try {
    await dropDatabase();
    console.log('');
    await initDatabase();
    console.log('\n✅ Database reset completed!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Main function
async function main() {
  const command = process.argv[2];

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${databaseConfig.host}`);
    console.log(`   Database: ${databaseConfig.database}`);
    console.log(`   User: ${databaseConfig.user}\n`);

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    switch (command) {
      case 'init':
        await initDatabase();
        break;

      case 'drop':
        await dropDatabase();
        break;

      case 'reset':
        await resetDatabase();
        break;

      default:
        console.log('Usage: npm run db:init | db:drop | db:reset');
        console.log('');
        console.log('Commands:');
        console.log('  db:init  - Create all database tables');
        console.log('  db:drop  - Drop all database tables');
        console.log('  db:reset - Drop and recreate all tables');
        process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n👋 Database connection closed.');
  }
}

// Run the script
main();
