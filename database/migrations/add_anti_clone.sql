-- Migration: Add anti-clone account features
-- Date: 2025-11-16

-- Add IP tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_verify_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS last_verify_user_agent TEXT,
ADD COLUMN IF NOT EXISTS last_verify_at TIMESTAMP;

-- Add index for IP lookup
CREATE INDEX IF NOT EXISTS idx_users_last_verify_ip ON users(last_verify_ip);

-- Add prevent_alts option to giveaways table
ALTER TABLE giveaways
ADD COLUMN IF NOT EXISTS prevent_alts BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.last_verify_ip IS 'IP address from last OAuth verification (IPv4 or IPv6)';
COMMENT ON COLUMN users.last_verify_user_agent IS 'User agent from last OAuth verification';
COMMENT ON COLUMN users.last_verify_at IS 'Timestamp of last OAuth verification';
COMMENT ON COLUMN giveaways.prevent_alts IS 'Prevent clone/alt accounts from entering (checks IP duplicates)';
