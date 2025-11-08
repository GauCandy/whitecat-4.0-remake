/**
 * Ban Repository
 * Handles database operations for user_bans table
 */

import { query, transaction } from '../pool';
import { userRepository, AccountStatus } from './user.repository';

// Ban interface matching database schema
export interface UserBan {
  id: number;
  discord_id: string;
  reason: string | null;
  banned_by: string | null;  // Discord ID of moderator
  banned_at: Date;
  expires_at: Date | null;  // NULL = permanent ban
  is_active: boolean;
  unbanned_at: Date | null;
  unbanned_by: string | null;  // Discord ID of moderator
  created_at: Date;
}

// Create ban input
export interface CreateBanInput {
  discord_id: string;
  reason?: string;
  banned_by?: string;  // Discord ID of moderator
  expires_at?: Date | null;  // NULL = permanent
}

// Unban input
export interface UnbanInput {
  discord_id: string;
  unbanned_by?: string;  // Discord ID of moderator
}

export class BanRepository {
  /**
   * Ban user (create ban record + update user status)
   * @param input - Ban information
   */
  async banUser(input: CreateBanInput): Promise<UserBan> {
    const { discord_id, reason, banned_by, expires_at } = input;

    return await transaction(async (client) => {
      // 1. Create ban record
      const banResult = await client.query(
        `INSERT INTO user_bans (discord_id, reason, banned_by, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [discord_id, reason || null, banned_by || null, expires_at || null]
      );

      // 2. Update user account status
      await client.query(
        `UPDATE users SET account_status = $1 WHERE discord_id = $2`,
        [AccountStatus.BANNED, discord_id]
      );

      return banResult.rows[0] as UserBan;
    });
  }

  /**
   * Unban user (deactivate ban record + update user status)
   * @param input - Unban information
   */
  async unbanUser(input: UnbanInput): Promise<UserBan | null> {
    const { discord_id, unbanned_by } = input;

    return await transaction(async (client) => {
      // 1. Get active ban
      const activeBanResult = await client.query(
        `SELECT * FROM user_bans
         WHERE discord_id = $1 AND is_active = true
         ORDER BY banned_at DESC
         LIMIT 1`,
        [discord_id]
      );

      if (activeBanResult.rows.length === 0) {
        return null;
      }

      // 2. Deactivate ban record
      const unbanResult = await client.query(
        `UPDATE user_bans
         SET is_active = false, unbanned_at = NOW(), unbanned_by = $1
         WHERE id = $2
         RETURNING *`,
        [unbanned_by || null, activeBanResult.rows[0].id]
      );

      // 3. Update user account status
      await client.query(
        `UPDATE users SET account_status = $1 WHERE discord_id = $2`,
        [AccountStatus.NORMAL, discord_id]
      );

      return unbanResult.rows[0] as UserBan;
    });
  }

  /**
   * Check if user is currently banned
   * Automatically unbans if temporary ban has expired
   */
  async isUserBanned(discord_id: string): Promise<boolean> {
    // Get active ban
    const activeBan = await this.getActiveBan(discord_id);

    if (!activeBan) {
      return false;
    }

    // Check if temporary ban has expired
    if (activeBan.expires_at) {
      const now = new Date();
      if (activeBan.expires_at < now) {
        // Auto-unban
        await this.unbanUser({ discord_id });
        return false;
      }
    }

    return true;
  }

  /**
   * Get active ban for user
   */
  async getActiveBan(discord_id: string): Promise<UserBan | null> {
    const result = await query<UserBan>(
      `SELECT * FROM user_bans
       WHERE discord_id = $1 AND is_active = true
       ORDER BY banned_at DESC
       LIMIT 1`,
      [discord_id]
    );

    return result[0] || null;
  }

  /**
   * Get all bans for user (including inactive/history)
   */
  async getUserBanHistory(discord_id: string): Promise<UserBan[]> {
    return await query<UserBan>(
      `SELECT * FROM user_bans
       WHERE discord_id = $1
       ORDER BY banned_at DESC`,
      [discord_id]
    );
  }

  /**
   * Get all active bans
   */
  async getAllActiveBans(): Promise<UserBan[]> {
    return await query<UserBan>(
      `SELECT * FROM user_bans
       WHERE is_active = true
       ORDER BY banned_at DESC`
    );
  }

  /**
   * Get bans expiring soon (within next N hours)
   */
  async getBansExpiringSoon(hours: number = 24): Promise<UserBan[]> {
    return await query<UserBan>(
      `SELECT * FROM user_bans
       WHERE is_active = true
         AND expires_at IS NOT NULL
         AND expires_at <= NOW() + INTERVAL '${hours} hours'
       ORDER BY expires_at ASC`
    );
  }

  /**
   * Get permanent bans
   */
  async getPermanentBans(): Promise<UserBan[]> {
    return await query<UserBan>(
      `SELECT * FROM user_bans
       WHERE is_active = true AND expires_at IS NULL
       ORDER BY banned_at DESC`
    );
  }

  /**
   * Get ban statistics
   */
  async getBanStats(): Promise<{
    total_bans: number;
    active_bans: number;
    permanent_bans: number;
    temporary_bans: number;
  }> {
    const result = await query<any>(
      `SELECT
         COUNT(*) as total_bans,
         COUNT(*) FILTER (WHERE is_active = true) as active_bans,
         COUNT(*) FILTER (WHERE is_active = true AND expires_at IS NULL) as permanent_bans,
         COUNT(*) FILTER (WHERE is_active = true AND expires_at IS NOT NULL) as temporary_bans
       FROM user_bans`
    );

    return {
      total_bans: parseInt(result[0].total_bans, 10),
      active_bans: parseInt(result[0].active_bans, 10),
      permanent_bans: parseInt(result[0].permanent_bans, 10),
      temporary_bans: parseInt(result[0].temporary_bans, 10),
    };
  }

  /**
   * Delete ban record (permanently remove from database)
   * Use with caution - usually you want to unban instead
   */
  async deleteBan(ban_id: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM user_bans WHERE id = $1 RETURNING id`,
      [ban_id]
    );

    return result.length > 0;
  }
}

// Export singleton
export const banRepository = new BanRepository();
