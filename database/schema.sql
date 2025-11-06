-- =====================================================
-- Discord Bot Database Schema
-- PostgreSQL Database Initialization Script
-- =====================================================

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- GUILDS TABLE
-- Store information about Discord servers
-- =====================================================
CREATE TABLE IF NOT EXISTS guilds (
    id VARCHAR(20) PRIMARY KEY,  -- Discord Guild ID
    name VARCHAR(255) NOT NULL,
    icon_url TEXT,
    owner_id VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for active guilds
CREATE INDEX IF NOT EXISTS idx_guilds_active ON guilds(is_active);
CREATE INDEX IF NOT EXISTS idx_guilds_joined_at ON guilds(joined_at);

-- =====================================================
-- USERS TABLE
-- Store information about Discord users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,  -- Discord User ID
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(4),
    global_name VARCHAR(255),
    avatar_url TEXT,
    is_bot BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_bot ON users(is_bot);

-- =====================================================
-- GUILD MEMBERS TABLE
-- Store information about users in specific guilds
-- =====================================================
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id VARCHAR(20) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(255),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    roles TEXT[],  -- Array of role IDs
    PRIMARY KEY (guild_id, user_id)
);

-- Indexes for guild members
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_active ON guild_members(is_active);

-- =====================================================
-- COMMAND LOGS TABLE
-- Log all command executions
-- =====================================================
CREATE TABLE IF NOT EXISTS command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id VARCHAR(20) REFERENCES guilds(id) ON DELETE SET NULL,
    user_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
    command_name VARCHAR(100) NOT NULL,
    options JSONB,
    channel_id VARCHAR(20),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Indexes for command logs
CREATE INDEX IF NOT EXISTS idx_command_logs_guild ON command_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_user ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_command ON command_logs(command_name);
CREATE INDEX IF NOT EXISTS idx_command_logs_executed ON command_logs(executed_at);

-- =====================================================
-- USER STATISTICS TABLE
-- Track user activity and statistics
-- =====================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id VARCHAR(20) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_commands INTEGER DEFAULT 0,
    last_command_at TIMESTAMP WITH TIME ZONE,
    join_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GUILD SETTINGS TABLE
-- Store custom settings per guild
-- =====================================================
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id VARCHAR(20) PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
    prefix VARCHAR(10) DEFAULT '!',
    language VARCHAR(10) DEFAULT 'en',
    welcome_channel_id VARCHAR(20),
    welcome_message TEXT,
    log_channel_id VARCHAR(20),
    auto_role_id VARCHAR(20),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- Auto-update updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_guilds_updated_at
    BEFORE UPDATE ON guilds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guild_settings_updated_at
    BEFORE UPDATE ON guild_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- Useful views for common queries
-- =====================================================

-- Active guild members view
CREATE OR REPLACE VIEW active_guild_members AS
SELECT
    gm.guild_id,
    gm.user_id,
    g.name as guild_name,
    u.username,
    u.global_name,
    gm.nickname,
    gm.joined_at,
    gm.roles
FROM guild_members gm
JOIN guilds g ON gm.guild_id = g.id
JOIN users u ON gm.user_id = u.id
WHERE gm.is_active = true AND g.is_active = true;

-- Command statistics view
CREATE OR REPLACE VIEW command_statistics AS
SELECT
    command_name,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT guild_id) as unique_guilds,
    MIN(executed_at) as first_executed,
    MAX(executed_at) as last_executed
FROM command_logs
GROUP BY command_name;

-- =====================================================
-- COMMENTS
-- Add descriptions to tables
-- =====================================================
COMMENT ON TABLE guilds IS 'Stores information about Discord servers (guilds)';
COMMENT ON TABLE users IS 'Stores information about Discord users';
COMMENT ON TABLE guild_members IS 'Junction table linking users to guilds with member-specific data';
COMMENT ON TABLE command_logs IS 'Logs all command executions for analytics and debugging';
COMMENT ON TABLE user_stats IS 'Tracks user activity statistics';
COMMENT ON TABLE guild_settings IS 'Stores custom configuration per guild';

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- You can add initial data here if needed
-- Example:
-- INSERT INTO guilds (id, name, owner_id) VALUES ('123456789', 'Test Server', '987654321')
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Database schema initialized successfully!';
    RAISE NOTICE 'Tables created: guilds, users, guild_members, command_logs, user_stats, guild_settings';
    RAISE NOTICE 'Views created: active_guild_members, command_statistics';
END $$;
