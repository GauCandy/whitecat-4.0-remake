-- Migration: Add missing OAuth and user columns to users table
-- Date: 2025-11-17
-- Description: Fix schema mismatch between code and database
--
-- CRITICAL FIX: Code expects these columns but they don't exist in schema.sql
-- This causes CRASHES in /verify, /profile, authorization checks, and OAuth callbacks

BEGIN;

-- Add missing user identity columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discriminator VARCHAR(10),
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add OAuth authorization columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_authorized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS oauth_scopes TEXT;

-- Add terms acceptance tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- Add Pterodactyl integration column (if needed for hosting features)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pterodactyl_user_id INTEGER;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_authorized ON users(is_authorized);
CREATE INDEX IF NOT EXISTS idx_users_oauth_token_expires_at ON users(oauth_token_expires_at);

-- Verify the updated structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

COMMIT;
