/**
 * User Repository
 * Handles database operations for users table
 */

import { query, transaction } from '../pool';

// Account status enum
export enum AccountStatus {
  PENDING = 0,  // User has not agreed to terms
  ACTIVE = 1,   // User agreed to terms and account is active
  BANNED = 2,   // User account is banned
}

// User interface matching database schema
export interface User {
  discord_id: string;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  agreed_terms_at: Date | null;
  account_status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}

// Create user input (only required fields)
export interface CreateUserInput {
  discord_id: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  account_status?: AccountStatus;
}

// Update user input (all fields optional except discord_id)
export interface UpdateUserInput {
  discord_id: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  account_status?: AccountStatus;
  agreed_terms_at?: Date;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { discord_id, email, access_token, refresh_token, account_status = AccountStatus.PENDING } = input;

    const result = await query<User>(
      `INSERT INTO users (discord_id, email, access_token, refresh_token, account_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [discord_id, email || null, access_token || null, refresh_token || null, account_status]
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
   * Sets account_status to ACTIVE and records agreed_terms_at timestamp
   */
  async agreeToTerms(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET account_status = $1, agreed_terms_at = NOW()
       WHERE discord_id = $2
       RETURNING *`,
      [AccountStatus.ACTIVE, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Ban user
   */
  async banUser(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET account_status = $1
       WHERE discord_id = $2
       RETURNING *`,
      [AccountStatus.BANNED, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Unban user (set to PENDING, they need to agree to terms again)
   */
  async unbanUser(discord_id: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET account_status = $1, agreed_terms_at = NULL
       WHERE discord_id = $2
       RETURNING *`,
      [AccountStatus.PENDING, discord_id]
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
   * Update refresh token
   */
  async updateRefreshToken(discord_id: string, refresh_token: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET refresh_token = $1
       WHERE discord_id = $2
       RETURNING *`,
      [refresh_token, discord_id]
    );

    return result[0] || null;
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
   * Get user count by status
   */
  async getUserCountByStatus(account_status: AccountStatus): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE account_status = $1`,
      [account_status]
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
