/**
 * Database module entry point
 * Exports all database-related functions and types
 */

export {
  getPool,
  testConnection,
  query,
  transaction,
  closePool,
} from './pool';

export {
  initializeDatabase,
  dropAllTables,
  resetDatabase,
} from './init';

// Helper functions for common database operations
import { query } from './pool';

/**
 * Guild-related database operations
 */
export const Guilds = {
  /**
   * Create or update a guild
   */
  async upsert(guildData: {
    id: string;
    name: string;
    icon_url?: string;
    owner_id: string;
  }) {
    const result = await query(
      `INSERT INTO guilds (id, name, icon_url, owner_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id)
       DO UPDATE SET
         name = EXCLUDED.name,
         icon_url = EXCLUDED.icon_url,
         owner_id = EXCLUDED.owner_id,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [guildData.id, guildData.name, guildData.icon_url, guildData.owner_id]
    );
    return result[0];
  },

  /**
   * Get a guild by ID
   */
  async findById(guildId: string) {
    const result = await query(
      'SELECT * FROM guilds WHERE id = $1',
      [guildId]
    );
    return result[0];
  },

  /**
   * Mark guild as inactive (left)
   */
  async markInactive(guildId: string) {
    await query(
      `UPDATE guilds
       SET is_active = false, left_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [guildId]
    );
  },

  /**
   * Get all active guilds
   */
  async getAllActive() {
    return query('SELECT * FROM guilds WHERE is_active = true');
  },
};

/**
 * User-related database operations
 */
export const Users = {
  /**
   * Create or update a user
   */
  async upsert(userData: {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string;
    avatar_url?: string;
    is_bot?: boolean;
  }) {
    const result = await query(
      `INSERT INTO users (id, username, discriminator, global_name, avatar_url, is_bot)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id)
       DO UPDATE SET
         username = EXCLUDED.username,
         discriminator = EXCLUDED.discriminator,
         global_name = EXCLUDED.global_name,
         avatar_url = EXCLUDED.avatar_url,
         is_bot = EXCLUDED.is_bot,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userData.id,
        userData.username,
        userData.discriminator || null,
        userData.global_name || null,
        userData.avatar_url || null,
        userData.is_bot || false,
      ]
    );
    return result[0];
  },

  /**
   * Get a user by ID
   */
  async findById(userId: string) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result[0];
  },

  /**
   * Search users by username
   */
  async searchByUsername(username: string) {
    return query(
      'SELECT * FROM users WHERE username ILIKE $1 LIMIT 10',
      [`%${username}%`]
    );
  },
};

/**
 * Guild member-related database operations
 */
export const GuildMembers = {
  /**
   * Add or update a guild member
   */
  async upsert(memberData: {
    guild_id: string;
    user_id: string;
    nickname?: string;
    roles?: string[];
  }) {
    const result = await query(
      `INSERT INTO guild_members (guild_id, user_id, nickname, roles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, user_id)
       DO UPDATE SET
         nickname = EXCLUDED.nickname,
         roles = EXCLUDED.roles,
         is_active = true
       RETURNING *`,
      [
        memberData.guild_id,
        memberData.user_id,
        memberData.nickname || null,
        memberData.roles || [],
      ]
    );
    return result[0];
  },

  /**
   * Mark member as inactive (left guild)
   */
  async markInactive(guildId: string, userId: string) {
    await query(
      `UPDATE guild_members
       SET is_active = false, left_at = CURRENT_TIMESTAMP
       WHERE guild_id = $1 AND user_id = $2`,
      [guildId, userId]
    );
  },

  /**
   * Get all members of a guild
   */
  async findByGuild(guildId: string) {
    return query(
      'SELECT * FROM active_guild_members WHERE guild_id = $1',
      [guildId]
    );
  },
};

/**
 * Command log-related database operations
 */
export const CommandLogs = {
  /**
   * Log a command execution
   */
  async create(logData: {
    guild_id?: string;
    user_id: string;
    command_name: string;
    options?: any;
    channel_id?: string;
    success?: boolean;
    error_message?: string;
  }) {
    const result = await query(
      `INSERT INTO command_logs
       (guild_id, user_id, command_name, options, channel_id, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        logData.guild_id || null,
        logData.user_id,
        logData.command_name,
        logData.options ? JSON.stringify(logData.options) : null,
        logData.channel_id || null,
        logData.success !== false,
        logData.error_message || null,
      ]
    );
    return result[0];
  },

  /**
   * Get command statistics
   */
  async getStatistics() {
    return query('SELECT * FROM command_statistics ORDER BY total_executions DESC');
  },

  /**
   * Get recent command logs
   */
  async getRecent(limit: number = 10) {
    return query(
      'SELECT * FROM command_logs ORDER BY executed_at DESC LIMIT $1',
      [limit]
    );
  },

  /**
   * Get command logs by user
   */
  async findByUser(userId: string, limit: number = 10) {
    return query(
      'SELECT * FROM command_logs WHERE user_id = $1 ORDER BY executed_at DESC LIMIT $2',
      [userId, limit]
    );
  },
};

/**
 * Guild settings-related database operations
 */
export const GuildSettings = {
  /**
   * Get guild settings
   */
  async get(guildId: string) {
    const result = await query(
      'SELECT * FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );
    return result[0] || null;
  },

  /**
   * Create or update guild settings
   */
  async upsert(guildId: string, settings: any) {
    const result = await query(
      `INSERT INTO guild_settings (guild_id, prefix, language, welcome_channel_id, welcome_message, log_channel_id, auto_role_id, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (guild_id)
       DO UPDATE SET
         prefix = EXCLUDED.prefix,
         language = EXCLUDED.language,
         welcome_channel_id = EXCLUDED.welcome_channel_id,
         welcome_message = EXCLUDED.welcome_message,
         log_channel_id = EXCLUDED.log_channel_id,
         auto_role_id = EXCLUDED.auto_role_id,
         settings = EXCLUDED.settings,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        guildId,
        settings.prefix || '!',
        settings.language || 'en',
        settings.welcome_channel_id || null,
        settings.welcome_message || null,
        settings.log_channel_id || null,
        settings.auto_role_id || null,
        settings.settings || {},
      ]
    );
    return result[0];
  },
};
