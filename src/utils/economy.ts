import { pool } from '../database/config';
import { PoolClient } from 'pg';

/**
 * Transaction type enum
 */
export enum TransactionType {
  Purchase = 'purchase',
  TransferSend = 'transfer_send',
  TransferReceive = 'transfer_receive',
  Refund = 'refund',
  AdminGrant = 'admin_grant',
}

/**
 * Transaction metadata interface
 */
export interface TransactionMetadata {
  related_user_id?: number;
  related_hosting_id?: number;
  description?: string;
  [key: string]: any;
}

/**
 * Economy operation result
 */
export interface EconomyResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * Transfer result
 */
export interface TransferResult {
  success: boolean;
  senderBalance: number;
  recipientBalance: number;
  error?: string;
}

/**
 * Get user balance
 * @param userId - Internal user ID (from users table)
 * @returns Current balance or null if not found
 */
export async function getBalance(userId: number): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT coins FROM user_economy WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return parseInt(result.rows[0].coins);
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
}

/**
 * Get user ID from Discord ID
 * @param discordId - Discord user ID
 * @returns Internal user ID or null if not found
 */
export async function getUserIdFromDiscordId(discordId: string): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE discord_id = $1',
      [discordId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    throw error;
  }
}

/**
 * Add coins to user balance and log transaction
 * @param userId - Internal user ID
 * @param amount - Amount to add (positive number)
 * @param type - Transaction type
 * @param metadata - Additional transaction data
 * @param client - Optional existing transaction client
 * @returns Economy operation result
 */
export async function addCoins(
  userId: number,
  amount: number,
  type: TransactionType,
  metadata: TransactionMetadata = {},
  client?: PoolClient
): Promise<EconomyResult> {
  // Use provided client or get a new one
  const dbClient = client || await pool.connect();
  const shouldRelease = !client; // Only release if we created the client

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    // Get current balance
    const balanceResult = await dbClient.query(
      'SELECT coins FROM user_economy WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('User economy account not found');
    }

    const balanceBefore = parseInt(balanceResult.rows[0].coins);
    const balanceAfter = balanceBefore + amount;

    // Update balance
    await dbClient.query(
      'UPDATE user_economy SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [balanceAfter, userId]
    );

    // Log transaction
    await dbClient.query(
      `INSERT INTO transactions
       (user_id, type, amount, balance_before, balance_after, related_user_id, related_hosting_id, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        metadata.related_user_id || null,
        metadata.related_hosting_id || null,
        metadata.description || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      success: true,
      balance: balanceAfter,
    };
  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    console.error('Error adding coins:', error);
    return {
      success: false,
      balance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

/**
 * Deduct coins from user balance and log transaction
 * @param userId - Internal user ID
 * @param amount - Amount to deduct (positive number)
 * @param type - Transaction type
 * @param metadata - Additional transaction data
 * @param client - Optional existing transaction client
 * @returns Economy operation result
 */
export async function deductCoins(
  userId: number,
  amount: number,
  type: TransactionType,
  metadata: TransactionMetadata = {},
  client?: PoolClient
): Promise<EconomyResult> {
  // Use provided client or get a new one
  const dbClient = client || await pool.connect();
  const shouldRelease = !client;

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    // Get current balance
    const balanceResult = await dbClient.query(
      'SELECT coins FROM user_economy WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('User economy account not found');
    }

    const balanceBefore = parseInt(balanceResult.rows[0].coins);

    // Check if user has enough balance
    if (balanceBefore < amount) {
      throw new Error('Insufficient balance');
    }

    const balanceAfter = balanceBefore - amount;

    // Update balance
    await dbClient.query(
      'UPDATE user_economy SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [balanceAfter, userId]
    );

    // Log transaction (amount is stored as positive, but it's a deduction)
    await dbClient.query(
      `INSERT INTO transactions
       (user_id, type, amount, balance_before, balance_after, related_user_id, related_hosting_id, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        metadata.related_user_id || null,
        metadata.related_hosting_id || null,
        metadata.description || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      success: true,
      balance: balanceAfter,
    };
  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    console.error('Error deducting coins:', error);
    return {
      success: false,
      balance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

/**
 * Transfer coins between two users
 * @param fromUserId - Sender's internal user ID
 * @param toUserId - Recipient's internal user ID
 * @param amount - Amount to transfer
 * @param description - Transfer description
 * @returns Transfer result
 */
export async function transferCoins(
  fromUserId: number,
  toUserId: number,
  amount: number,
  description?: string
): Promise<TransferResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Deduct from sender
    const deductResult = await deductCoins(
      fromUserId,
      amount,
      TransactionType.TransferSend,
      {
        related_user_id: toUserId,
        description: description || 'Transfer to another user',
      },
      client
    );

    if (!deductResult.success) {
      throw new Error(deductResult.error || 'Failed to deduct coins from sender');
    }

    // Add to recipient
    const addResult = await addCoins(
      toUserId,
      amount,
      TransactionType.TransferReceive,
      {
        related_user_id: fromUserId,
        description: description || 'Transfer from another user',
      },
      client
    );

    if (!addResult.success) {
      throw new Error(addResult.error || 'Failed to add coins to recipient');
    }

    await client.query('COMMIT');

    return {
      success: true,
      senderBalance: deductResult.balance,
      recipientBalance: addResult.balance,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error transferring coins:', error);
    return {
      success: false,
      senderBalance: 0,
      recipientBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}

/**
 * Create or initialize user economy account
 * @param userId - Internal user ID
 * @param initialBalance - Initial balance (default: 0)
 * @returns Success status
 */
export async function createEconomyAccount(
  userId: number,
  initialBalance: number = 0
): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO user_economy (user_id, coins)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, initialBalance]
    );

    return true;
  } catch (error) {
    console.error('Error creating economy account:', error);
    return false;
  }
}

/**
 * Check if user has economy account
 * @param userId - Internal user ID
 * @returns True if account exists
 */
export async function hasEconomyAccount(userId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT 1 FROM user_economy WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking economy account:', error);
    return false;
  }
}
