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

// Verification level enum
export enum VerificationLevel {
  NOT_VERIFIED = 0,  // Not verified (no OAuth)
  BASIC = 1,         // Basic OAuth (identify only, agreed to terms)
  VERIFIED = 2,      // Verified with email (identify + email)
}

// User interface matching database schema
export interface User {
  id: number;  // Auto-increment ID for milestone tracking
  discord_id: string;
  verification_level: VerificationLevel;
  account_status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}

// Create user input (only required fields)
export interface CreateUserInput {
  discord_id: string;
  verification_level?: VerificationLevel;
  account_status?: AccountStatus;
}

// Update user input (all fields optional except discord_id)
export interface UpdateUserInput {
  discord_id: string;
  verification_level?: VerificationLevel;
  account_status?: AccountStatus;
}

export class UserRepository {
  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const {
      discord_id,
      verification_level = VerificationLevel.NOT_VERIFIED,
      account_status = AccountStatus.NORMAL
    } = input;

    const result = await query<User>(
      `INSERT INTO users (discord_id, verification_level, account_status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [discord_id, verification_level, account_status]
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
   * Set user verification level
   */
  async setVerificationLevel(discord_id: string, level: VerificationLevel): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users
       SET verification_level = $1
       WHERE discord_id = $2
       RETURNING *`,
      [level, discord_id]
    );

    return result[0] || null;
  }

  /**
   * Set user to basic verification (OAuth identify only)
   */
  async setBasicVerification(discord_id: string): Promise<User | null> {
    return this.setVerificationLevel(discord_id, VerificationLevel.BASIC);
  }

  /**
   * Set user to full verification (OAuth identify + email)
   */
  async setFullVerification(discord_id: string): Promise<User | null> {
    return this.setVerificationLevel(discord_id, VerificationLevel.VERIFIED);
  }

  /**
   * Check if user has basic verification or higher
   */
  async hasBasicVerification(discord_id: string): Promise<boolean> {
    const user = await this.getUserByDiscordId(discord_id);
    return user !== null && user.verification_level >= VerificationLevel.BASIC;
  }

  /**
   * Check if user has full verification
   */
  async hasFullVerification(discord_id: string): Promise<boolean> {
    const user = await this.getUserByDiscordId(discord_id);
    return user !== null && user.verification_level === VerificationLevel.VERIFIED;
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
   * Get all users with specific verification level
   */
  async getUsersByVerificationLevel(level: VerificationLevel): Promise<User[]> {
    return await query<User>(
      `SELECT * FROM users WHERE verification_level = $1 ORDER BY created_at DESC`,
      [level]
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
   * Get users with basic verification or higher
   */
  async getBasicVerifiedUsersCount(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE verification_level >= $1`,
      [VerificationLevel.BASIC]
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Get fully verified users (with email)
   */
  async getFullyVerifiedUsersCount(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE verification_level = $1`,
      [VerificationLevel.VERIFIED]
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
