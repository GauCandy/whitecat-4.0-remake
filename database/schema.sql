-- WhiteCat Discord Bot Database Schema

-- =============================================================================
-- Users Table
-- =============================================================================
-- Stores user information including Discord ID, email, terms agreement, and account status

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  -- Auto-increment ID for milestone tracking (e.g., 10000th user event)
  id SERIAL,

  -- Primary key: Discord user ID (stored as TEXT to handle large snowflake IDs)
  discord_id TEXT PRIMARY KEY,

  -- User email (NULL if not verified via OAuth)
  email TEXT,

  -- Terms agreement status:
  -- 0 = not agreed
  -- 1 = agreed
  agreed_terms SMALLINT NOT NULL DEFAULT 0 CHECK (agreed_terms IN (0, 1)),

  -- Account status:
  -- 0 = normal (no issues)
  -- 1 = warned/banned (temporary or permanent)
  account_status SMALLINT NOT NULL DEFAULT 0 CHECK (account_status IN (0, 1)),

  -- Ban expiration time (NULL = permanent ban)
  ban_expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamp when user was banned/warned
  banned_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_agreed_terms ON users(agreed_terms);
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
COMMENT ON COLUMN users.email IS 'User email address (NULL if not verified)';
COMMENT ON COLUMN users.agreed_terms IS 'Terms agreement status: 0=not agreed, 1=agreed';
COMMENT ON COLUMN users.account_status IS 'Account status: 0=normal, 1=warned/banned';
COMMENT ON COLUMN users.ban_expires_at IS 'Ban expiration time (NULL = permanent ban)';
COMMENT ON COLUMN users.banned_at IS 'Timestamp when user was banned/warned';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user record was last updated';
