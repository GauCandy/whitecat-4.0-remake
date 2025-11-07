/**
 * User Repository
 * Handles database operations for users table
 */

import { query, transaction } from '../pool';

// Account status enum
export enum AccountStatus {
  NORMAL = 0,   // No issues
  BANNED = 1,   // Warned/banned (temporary or permanent)
}

// User interface matching database schema
export interface User {
  id: number;  // Auto-increment ID for milestone tracking
  discord_id: string;
  email: string | null;
  agreed_terms: number;  // 0 = not agreed, 1 = agreed
  account_status: AccountStatus;
  ban_expires_at: Date | null;  // NULL = permanent ban
  banned_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Create user input (only required fields)
export interface CreateUserInput {
  discord_id: string;
  email?: string;
  agreed_terms?: number;
  account_status?: AccountStatus;
}

// Update user input (all fields optional except discord_id)
export interface UpdateUserInput {
  discord_id: string;
  email?: string;
  agreed_terms?: number;
  account_status?: AccountStatus;
  ban_expires_at?: Date | null;
  banned_at?: Date | null;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { discord_id, email, agreed_terms = 0, account_status = AccountStatus.NORMAL } = input;

    const result = await query<User>(
      `INSERT INTO users (discord_id, email, agreed_terms, account_status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [discord_id, email || null, agreed_terms, account_status]
    );

    return result[0];
  }

  /**
   * Get user by Discord ID
   */
  async getUserByDiscordId(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `SELECT * FROM users WHERE discord_id = $1`,
      [discord_id]
    );

    return result[0] || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    return result[0] || null;
  }

  /**
   * Get user by auto-increment ID
   */
  async getUserById(id: number): Promise<User | null> {
    const result = await query<User>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );

    return result[0] || null;
  }

  /**
   * Update user information
   */
  async updateUser(input: UpdateUserInput): Promise<User | null> {
    const { discord_id, ...updates } = input;

    // Build dynamic SET clause
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return this.getUserByDiscordId(discord_id);
    }

    values.push(discord_id);

    const result = await query<User>(
      `UPDATE users
       SET ${setClause.join(', ')}
       WHERE discord_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result[0] || null;
  }

  /**
   * Agree to terms of service
   * Sets agreed_terms to 1
   */
  async agreeToTerms(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET agreed_terms = 1
       WHERE discord_id = $1
       RETURNING *`,
      [discord_id]
    );

    return result[0] || null;
  }

  /**
   * Ban user (permanently or temporarily)
   * @param discord_id - Discord user ID
   * @param expiresAt - Ban expiration time (NULL for permanent)
   */
  async banUser(discord_id: string, expiresAt: Date | null = null): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET account_status = $1, banned_at = NOW(), ban_expires_at = $2
       WHERE discord_id = $3
       RETURNING *`,
      [AccountStatus.BANNED, expiresAt, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Unban user
   */
  async unbanUser(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET account_status = $1, ban_expires_at = NULL, banned_at = NULL
       WHERE discord_id = $2
       RETURNING *`,
      [AccountStatus.NORMAL, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Check if user is currently banned
   * Returns true if banned and ban hasn't expired
   */
  async isUserBanned(discord_id: string): Promise<boolean> {
    const user = await this.getUserByDiscordId(discord_id);

    if (!user || user.account_status !== AccountStatus.BANNED) {
      return false;
    }

    // If ban has no expiration, it's permanent
    if (!user.ban_expires_at) {
      return true;
    }

    // Check if ban has expired
    const now = new Date();
    if (user.ban_expires_at < now) {
      // Ban expired, unban user automatically
      await this.unbanUser(discord_id);
      return false;
    }

    return true;
  }

  /**
   * Set user email (after OAuth verification)
   */
  async setUserEmail(discord_id: string, email: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET email = $1
       WHERE discord_id = $2
       RETURNING *`,
      [email, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Delete user
   */
  async deleteUser(discord_id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM users WHERE discord_id = $1 RETURNING discord_id`,
      [discord_id]
    );

    return result.length > 0;
  }

  /**
   * Check if user exists
   */
  async userExists(discord_id: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM users WHERE discord_id = $1) as exists`,
      [discord_id]
    );

    return result[0].exists;
  }

  /**
   * Get all users with specific account status
   */
  async getUsersByStatus(account_status: AccountStatus): Promise<User[]> {
    return await query<User>(
      `SELECT * FROM users WHERE account_status = $1 ORDER BY created_at DESC`,
      [account_status]
    );
  }

  /**
   * Get total user count
   */
  async getTotalUsers(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users`
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Get users who agreed to terms
   */
  async getAgreedUsersCount(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE agreed_terms = 1`
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Get verified users (have email)
   */
  async getVerifiedUsersCount(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL`
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Get or create user (upsert)
   * If user exists, return existing user. Otherwise, create new one.
   */
  async getOrCreateUser(input: CreateUserInput): Promise<User> {
    const existing = await this.getUserByDiscordId(input.discord_id);

    if (existing) {
      return existing;
    }

    return await this.createUser(input);
  }
}

// Export singleton
export const userRepository = new UserRepository();
