/**
 * Guild Repository
 * Handles database operations for guild settings
 */

import { query } from '../pool';
import { SupportedLocale } from '../../types/locale';

export interface Guild {
  guild_id: string;
  locale: SupportedLocale;
  prefix: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGuildInput {
  guild_id: string;
  locale?: SupportedLocale;
  prefix?: string;
}

export interface UpdateGuildInput {
  locale?: SupportedLocale;
  prefix?: string;
}

class GuildRepository {
  /**
   * Get guild settings by guild ID
   * @param guildId - Discord guild ID
   * @returns Guild object or null if not found
   */
  async getGuildById(guildId: string): Promise<Guild | null> {
    const result = await query<Guild>(
      'SELECT * FROM guilds WHERE guild_id = $1',
      [guildId]
    );

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Create a new guild record
   * @param input - Guild creation data
   * @returns Created guild object
   */
  async createGuild(input: CreateGuildInput): Promise<Guild> {
    const { guild_id, locale = 'vi', prefix = '!' } = input;

    const result = await query<Guild>(
      `INSERT INTO guilds (guild_id, locale, prefix)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [guild_id, locale, prefix]
    );

    return result[0];
  }

  /**
   * Get or create guild (auto-create if not exists)
   * @param guildId - Discord guild ID
   * @param locale - Optional locale to set when creating (defaults to 'vi')
   * @returns Guild object
   */
  async getOrCreateGuild(guildId: string, locale?: SupportedLocale): Promise<Guild> {
    let guild = await this.getGuildById(guildId);

    if (!guild) {
      guild = await this.createGuild({ guild_id: guildId, locale });
    }

    return guild;
  }

  /**
   * Update guild settings
   * @param guildId - Discord guild ID
   * @param input - Update data
   * @returns Updated guild object
   */
  async updateGuild(guildId: string, input: UpdateGuildInput): Promise<Guild> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.locale !== undefined) {
      updates.push(`locale = $${paramIndex++}`);
      values.push(input.locale);
    }

    if (input.prefix !== undefined) {
      updates.push(`prefix = $${paramIndex++}`);
      values.push(input.prefix);
    }

    if (updates.length === 0) {
      // No updates provided, return current guild
      const guild = await this.getGuildById(guildId);
      if (!guild) {
        throw new Error('Guild not found');
      }
      return guild;
    }

    values.push(guildId); // Add guild_id as last parameter

    const result = await query<Guild>(
      `UPDATE guilds
       SET ${updates.join(', ')}
       WHERE guild_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.length === 0) {
      throw new Error('Guild not found');
    }

    return result[0];
  }

  /**
   * Set guild locale
   * @param guildId - Discord guild ID
   * @param locale - Locale to set
   * @returns Updated guild object
   */
  async setLocale(guildId: string, locale: SupportedLocale): Promise<Guild> {
    return this.updateGuild(guildId, { locale });
  }

  /**
   * Set guild prefix
   * @param guildId - Discord guild ID
   * @param prefix - Prefix to set
   * @returns Updated guild object
   */
  async setPrefix(guildId: string, prefix: string): Promise<Guild> {
    return this.updateGuild(guildId, { prefix });
  }

  /**
   * Delete a guild record
   * @param guildId - Discord guild ID
   * @returns True if deleted, false if not found
   */
  async deleteGuild(guildId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM guilds WHERE guild_id = $1',
      [guildId]
    );

    return result.length > 0;
  }

  /**
   * Get all guilds
   * @returns Array of all guilds
   */
  async getAllGuilds(): Promise<Guild[]> {
    return await query<Guild>('SELECT * FROM guilds ORDER BY created_at DESC');
  }

  /**
   * Get guild count
   * @returns Number of guilds
   */
  async getGuildCount(): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM guilds'
    );

    return parseInt(result[0].count, 10);
  }
}

// Export singleton
export const guildRepository = new GuildRepository();
