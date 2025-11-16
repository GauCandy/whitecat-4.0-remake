-- Add pterodactyl_user_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pterodactyl_user_id INTEGER;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_pterodactyl_user_id ON users(pterodactyl_user_id);
