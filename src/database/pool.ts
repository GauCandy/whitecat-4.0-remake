import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function getDatabaseConfig(): PoolConfig {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const poolMin = process.env.DB_POOL_MIN;
  const poolMax = process.env.DB_POOL_MAX;

  if (!host || !port || !database || !user || !password) {
    throw new Error(
      'Missing required database configuration. Please check your .env file for DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD.'
    );
  }

  return {
    host,
    port: parseInt(port, 10),
    database,
    user,
    password,
    min: poolMin ? parseInt(poolMin, 10) : 2,
    max: poolMax ? parseInt(poolMax, 10) : 10,
    // Connection timeout
    connectionTimeoutMillis: 5000,
    // Idle timeout
    idleTimeoutMillis: 30000,
    // Log queries in development
    ...(process.env.NODE_ENV === 'development' && {
      // You can add query logging here if needed
    }),
  };
}

// Create a singleton pool instance
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err: Error) => {
      console.error('[DATABASE ERROR] Unexpected error on idle client:', err);
    });

    // Log successful connection
    pool.on('connect', () => {
      console.log('[DATABASE] New client connected to the pool');
    });

    // Log when client is removed
    pool.on('remove', () => {
      console.log('[DATABASE] Client removed from pool');
    });

    console.log('[DATABASE] Connection pool created successfully');
  }

  return pool;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('[DATABASE] Connection test successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[DATABASE ERROR] Connection test failed:', error);
    return false;
  }
}

// Execute a query with automatic connection handling
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    console.log('[DATABASE QUERY]', {
      text,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result.rows;
  } catch (error) {
    console.error('[DATABASE ERROR] Query failed:', {
      text,
      error,
    });
    throw error;
  }
}

// Execute a transaction
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    console.log('[DATABASE] Transaction committed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DATABASE ERROR] Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Close the pool (useful for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DATABASE] Connection pool closed');
  }
}
