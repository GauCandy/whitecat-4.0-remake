-- Migration: Remove guild_name from guilds table
-- Date: 2025-11-16

-- Remove guild_name column (no longer needed)
ALTER TABLE guilds DROP COLUMN IF EXISTS guild_name;

-- Remove owner_id column (can query from Discord API)
ALTER TABLE guilds DROP COLUMN IF EXISTS owner_id;

-- Remove member_count column (can query from Discord API)
ALTER TABLE guilds DROP COLUMN IF EXISTS member_count;

-- Remove icon column (can query from Discord API)
ALTER TABLE guilds DROP COLUMN IF EXISTS icon;

-- Remove is_active column (use left_at IS NULL instead)
ALTER TABLE guilds DROP COLUMN IF EXISTS is_active;

-- Remove updated_at column (not needed)
ALTER TABLE guilds DROP COLUMN IF EXISTS updated_at;

-- Verify the final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'guilds'
ORDER BY ordinal_position;
