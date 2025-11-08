/**
 * User Profile Repository
 * Handles database operations for user_profiles table
 * This table stores Discord profile data (email, avatar, username) for verified users only
 */

import { query } from '../pool';

// User profile interface matching database schema
export interface UserProfile {
  discord_id: string;
  username: string;
  discriminator: string | null;
  avatar: string | null;
  email: string;
  verified_at: Date;
  updated_at: Date;
}

// Create profile input
export interface CreateProfileInput {
  discord_id: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  email: string;
}

// Update profile input
export interface UpdateProfileInput {
  discord_id: string;
  username?: string;
  discriminator?: string | null;
  avatar?: string | null;
  email?: string;
}

export class UserProfileRepository {
  /**
   * Create a new user profile
   */
  async createProfile(input: CreateProfileInput): Promise<UserProfile> {
    const { discord_id, username, discriminator, avatar, email } = input;

    const result = await query<UserProfile>(
      `INSERT INTO user_profiles (discord_id, username, discriminator, avatar, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [discord_id, username, discriminator || null, avatar || null, email]
    );

    return result[0];
  }

  /**
   * Get user profile by Discord ID
   */
  async getProfileByDiscordId(discord_id: string): Promise<UserProfile | null> {
    const result = await query<UserProfile>(
      `SELECT * FROM user_profiles WHERE discord_id = $1`,
      [discord_id]
    );

    return result[0] || null;
  }

  /**
   * Get user profile by email
   */
  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const result = await query<UserProfile>(
      `SELECT * FROM user_profiles WHERE email = $1`,
      [email]
    );

    return result[0] || null;
  }

  /**
   * Update user profile
   */
  async updateProfile(input: UpdateProfileInput): Promise<UserProfile | null> {
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
      return this.getProfileByDiscordId(discord_id);
    }

    values.push(discord_id);

    const result = await query<UserProfile>(
      `UPDATE user_profiles
       SET ${setClause.join(', ')}
       WHERE discord_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result[0] || null;
  }

  /**
   * Delete user profile
   */
  async deleteProfile(discord_id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM user_profiles WHERE discord_id = $1 RETURNING discord_id`,
      [discord_id]
    );

    return result.length > 0;
  }

  /**
   * Check if profile exists
   */
  async profileExists(discord_id: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM user_profiles WHERE discord_id = $1) as exists`,
      [discord_id]
    );

    return result[0].exists;
  }

  /**
   * Get or create user profile (upsert)
   * If profile exists, update it. Otherwise, create new one.
   */
  async upsertProfile(input: CreateProfileInput): Promise<UserProfile> {
    const { discord_id, username, discriminator, avatar, email } = input;

    const result = await query<UserProfile>(
      `INSERT INTO user_profiles (discord_id, username, discriminator, avatar, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (discord_id) DO UPDATE
       SET username = EXCLUDED.username,
           discriminator = EXCLUDED.discriminator,
           avatar = EXCLUDED.avatar,
           email = EXCLUDED.email,
           updated_at = NOW()
       RETURNING *`,
      [discord_id, username, discriminator || null, avatar || null, email]
    );

    return result[0];
  }

  /**
   * Get total profile count
   */
  async getTotalProfiles(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_profiles`
    );

    return parseInt(result[0].count, 10);
  }

  /**
   * Get recent profiles (by verified_at)
   */
  async getRecentProfiles(limit: number = 10): Promise<UserProfile[]> {
    return await query<UserProfile>(
      `SELECT * FROM user_profiles ORDER BY verified_at DESC LIMIT $1`,
      [limit]
    );
  }
}

// Export singleton
export const userProfileRepository = new UserProfileRepository();
