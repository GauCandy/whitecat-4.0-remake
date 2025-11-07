-- WhiteCat Discord Bot Database Schema

-- =============================================================================
-- Users Table
-- =============================================================================
-- Stores user information including Discord ID, email, tokens, and account status

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  -- Primary key: Discord user ID (stored as TEXT to handle large snowflake IDs)
  discord_id TEXT PRIMARY KEY,

  -- User email
  email TEXT UNIQUE,

  -- OAuth access token (from Discord OAuth)
  access_token TEXT,

  -- Refresh token for OAuth re-authentication
  refresh_token TEXT,

  -- Timestamp when user agreed to terms of service (via OAuth)
  agreed_terms_at TIMESTAMP WITH TIME ZONE,

  -- Account status:
  -- 0 (pending): User has not agreed to terms
  -- 1 (active): User agreed to terms and account is active
  -- 2 (banned): User account is banned
  account_status SMALLINT NOT NULL DEFAULT 0 CHECK (account_status IN (0, 1, 2)),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

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
COMMENT ON COLUMN users.discord_id IS 'Discord user ID (snowflake)';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.access_token IS 'OAuth access token from Discord';
COMMENT ON COLUMN users.refresh_token IS 'OAuth refresh token for re-authentication';
COMMENT ON COLUMN users.agreed_terms_at IS 'Timestamp when user completed OAuth (agreed to terms)';
COMMENT ON COLUMN users.account_status IS 'Account status: 0=pending, 1=active, 2=banned';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user record was last updated';
