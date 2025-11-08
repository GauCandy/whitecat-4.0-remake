-- WhiteCat Discord Bot Database Schema

-- =============================================================================
-- Users Table
-- =============================================================================
-- Stores user information including Discord ID, verification level, and account status

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  -- Auto-increment ID for milestone tracking (e.g., 10000th user event)
  id SERIAL,

  -- Primary key: Discord user ID (stored as TEXT to handle large snowflake IDs)
  discord_id TEXT PRIMARY KEY,

  -- Verification level:
  -- 0 = not verified (no OAuth)
  -- 1 = basic (OAuth identify only, agreed to terms)
  -- 2 = verified (OAuth identify + email)
  verification_level SMALLINT NOT NULL DEFAULT 0 CHECK (verification_level IN (0, 1, 2)),

  -- Account status:
  -- 0 = normal (no issues)
  -- 1 = warned/banned (temporary or permanent)
  account_status SMALLINT NOT NULL DEFAULT 0 CHECK (account_status IN (0, 1)),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_verification_level ON users(verification_level);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns for documentation
COMMENT ON TABLE users IS 'Stores user information for the Discord bot';
COMMENT ON COLUMN users.id IS 'Auto-increment ID for milestone tracking';
COMMENT ON COLUMN users.discord_id IS 'Discord user ID (snowflake)';
COMMENT ON COLUMN users.verification_level IS 'Verification level: 0=not verified, 1=basic OAuth, 2=verified with email';
COMMENT ON COLUMN users.account_status IS 'Account status: 0=normal, 1=warned/banned';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user record was last updated';

-- =============================================================================
-- User Profiles Table
-- =============================================================================
-- Stores Discord profile information for verified users (email, avatar, etc)
-- This table is separate to avoid wasting space on users who don't verify email

CREATE TABLE IF NOT EXISTS user_profiles (
  -- Foreign key to users table (Primary Key)
  discord_id TEXT PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,

  -- Discord user info
  username TEXT NOT NULL,
  discriminator TEXT,  -- Can be NULL for new Discord usernames without discriminator
  avatar TEXT,         -- Discord avatar hash

  -- Email (only for verified users)
  email TEXT NOT NULL UNIQUE,

  -- Timestamps
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified_at ON user_profiles(verified_at);

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns for documentation
COMMENT ON TABLE user_profiles IS 'Stores Discord profile information for verified users (email, avatar, etc)';
COMMENT ON COLUMN user_profiles.discord_id IS 'Discord user ID (foreign key to users)';
COMMENT ON COLUMN user_profiles.username IS 'Discord username';
COMMENT ON COLUMN user_profiles.discriminator IS 'Discord discriminator (legacy, can be NULL)';
COMMENT ON COLUMN user_profiles.avatar IS 'Discord avatar hash';
COMMENT ON COLUMN user_profiles.email IS 'User email address (required for verified users)';
COMMENT ON COLUMN user_profiles.verified_at IS 'Timestamp when user completed email verification';
COMMENT ON COLUMN user_profiles.updated_at IS 'Timestamp when profile was last updated';

-- =============================================================================
-- User Bans Table
-- =============================================================================
-- Stores detailed ban information for users
-- This table is separate to avoid wasting space on users who are never banned

CREATE TABLE IF NOT EXISTS user_bans (
  -- Primary key
  id SERIAL PRIMARY KEY,

  -- Foreign key to users table
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,

  -- Ban reason (e.g., "Spam", "Harassment", "ToS violation")
  reason TEXT,

  -- Discord ID of the moderator/admin who issued the ban
  banned_by TEXT,

  -- Timestamp when ban was issued
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ban expiration time (NULL = permanent ban)
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Whether this ban is currently active
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamp when ban was lifted (NULL if still active)
  unbanned_at TIMESTAMP WITH TIME ZONE,

  -- Discord ID of the moderator/admin who lifted the ban
  unbanned_by TEXT,

  -- Timestamp when record was created
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_bans_discord_id ON user_bans(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_expires_at ON user_bans(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_at ON user_bans(banned_at);

-- Add comments to table and columns for documentation
COMMENT ON TABLE user_bans IS 'Stores detailed ban information and history';
COMMENT ON COLUMN user_bans.id IS 'Auto-increment primary key';
COMMENT ON COLUMN user_bans.discord_id IS 'Discord user ID (foreign key)';
COMMENT ON COLUMN user_bans.reason IS 'Reason for the ban';
COMMENT ON COLUMN user_bans.banned_by IS 'Discord ID of moderator who issued ban';
COMMENT ON COLUMN user_bans.banned_at IS 'Timestamp when ban was issued';
COMMENT ON COLUMN user_bans.expires_at IS 'Ban expiration time (NULL = permanent)';
COMMENT ON COLUMN user_bans.is_active IS 'Whether this ban is currently active';
COMMENT ON COLUMN user_bans.unbanned_at IS 'Timestamp when ban was lifted';
COMMENT ON COLUMN user_bans.unbanned_by IS 'Discord ID of moderator who lifted ban';
COMMENT ON COLUMN user_bans.created_at IS 'Timestamp when record was created';

-- =============================================================================
-- Guilds Table
-- =============================================================================
-- Stores guild (server) settings including locale and custom prefix
-- Auto-created when bot joins a new guild

CREATE TABLE IF NOT EXISTS guilds (
  -- Primary key: Discord guild ID (stored as TEXT to handle large snowflake IDs)
  guild_id TEXT PRIMARY KEY,

  -- Guild locale (language)
  -- Default: 'vi' (Vietnamese)
  -- Supported: 'vi', 'en'
  locale TEXT NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),

  -- Custom command prefix
  -- Default: '!' (can be changed by server admins)
  prefix TEXT NOT NULL DEFAULT '!',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guilds_locale ON guilds(locale);
CREATE INDEX IF NOT EXISTS idx_guilds_created_at ON guilds(created_at);

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_guilds_updated_at ON guilds;
CREATE TRIGGER update_guilds_updated_at
  BEFORE UPDATE ON guilds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns for documentation
COMMENT ON TABLE guilds IS 'Stores guild (server) settings for the Discord bot';
COMMENT ON COLUMN guilds.guild_id IS 'Discord guild ID (snowflake)';
COMMENT ON COLUMN guilds.locale IS 'Guild language setting: vi=Vietnamese, en=English';
COMMENT ON COLUMN guilds.prefix IS 'Custom command prefix for this guild';
COMMENT ON COLUMN guilds.created_at IS 'Timestamp when guild was added to database';
COMMENT ON COLUMN guilds.updated_at IS 'Timestamp when guild settings were last updated';
