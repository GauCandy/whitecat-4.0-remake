-- Migration: Create user_verify_history table for anti-clone tracking
-- Date: 2025-11-16

-- Create verify history table
CREATE TABLE IF NOT EXISTS user_verify_history (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

  -- Thông tin xác thực
  verify_ip VARCHAR(45) NOT NULL,              -- IP address (IPv4 hoặc IPv6)
  verify_user_agent TEXT,                      -- User agent của browser
  verify_method VARCHAR(50) DEFAULT 'oauth',   -- Phương thức: 'oauth', 'manual', 'auto'

  -- Metadata
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB                               -- Thông tin bổ sung (JSON)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verify_history_user_id ON user_verify_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verify_history_ip ON user_verify_history(verify_ip);
CREATE INDEX IF NOT EXISTS idx_verify_history_verified_at ON user_verify_history(verified_at DESC);

-- Migrate existing data from users table (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_verify_ip'
  ) THEN
    -- Copy existing verification data to history table
    INSERT INTO user_verify_history (user_id, verify_ip, verify_user_agent, verified_at)
    SELECT id, last_verify_ip, last_verify_user_agent, last_verify_at
    FROM users
    WHERE last_verify_ip IS NOT NULL;

    -- Drop old columns from users table
    ALTER TABLE users DROP COLUMN IF EXISTS last_verify_ip;
    ALTER TABLE users DROP COLUMN IF EXISTS last_verify_user_agent;
    ALTER TABLE users DROP COLUMN IF EXISTS last_verify_at;

    -- Drop old index if exists
    DROP INDEX IF EXISTS idx_users_last_verify_ip;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE user_verify_history IS 'Stores complete verification history for each user to detect clone/alt accounts';
COMMENT ON COLUMN user_verify_history.verify_ip IS 'IP address from OAuth verification (IPv4 or IPv6)';
COMMENT ON COLUMN user_verify_history.verify_user_agent IS 'User agent from OAuth verification';
COMMENT ON COLUMN user_verify_history.verify_method IS 'Verification method: oauth, manual, or auto';
COMMENT ON COLUMN user_verify_history.verified_at IS 'Timestamp of verification';

-- Add prevent_alts to giveaways if not exists
ALTER TABLE giveaways
ADD COLUMN IF NOT EXISTS prevent_alts BOOLEAN DEFAULT false;

COMMENT ON COLUMN giveaways.prevent_alts IS 'Prevent clone/alt accounts from entering (checks IP duplicates)';
