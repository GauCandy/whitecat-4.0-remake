import fs from 'fs';
import path from 'path';
import { getPool, testConnection, closePool } from './pool';

/**
 * Initialize the database by running the schema.sql file
 */
async function initializeDatabase(): Promise<void> {
  console.log('[DATABASE INIT] Starting database initialization...');

  try {
    // Test connection first
    console.log('[DATABASE INIT] Testing connection...');
    const isConnected = await testConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Read schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    console.log('[DATABASE INIT] Reading schema from:', schemaPath);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    console.log('[DATABASE INIT] Executing schema...');
    const pool = getPool();
    await pool.query(schema);

    console.log('[DATABASE INIT] Schema executed successfully!');
    console.log('[DATABASE INIT] Database initialization completed!');

    // Display table information
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('[DATABASE INIT] Tables in database:');
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // Display view information
    const views = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (views.rows.length > 0) {
      console.log('[DATABASE INIT] Views in database:');
      views.rows.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }

  } catch (error) {
    console.error('[DATABASE INIT ERROR] Failed to initialize database:', error);
    throw error;
  } finally {
    await closePool();
  }
}

/**
 * Drop all tables (use with caution!)
 */
async function dropAllTables(): Promise<void> {
  console.log('[DATABASE INIT] WARNING: Dropping all tables...');

  try {
    const pool = getPool();

    // Drop all tables
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log('[DATABASE INIT] All tables dropped successfully!');
  } catch (error) {
    console.error('[DATABASE INIT ERROR] Failed to drop tables:', error);
    throw error;
  } finally {
    await closePool();
  }
}

/**
 * Reset database (drop and recreate)
 */
async function resetDatabase(): Promise<void> {
  console.log('[DATABASE INIT] Resetting database...');

  try {
    await dropAllTables();
    await initializeDatabase();
    console.log('[DATABASE INIT] Database reset completed!');
  } catch (error) {
    console.error('[DATABASE INIT ERROR] Failed to reset database:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'drop':
      console.log('[DATABASE INIT] Are you sure you want to drop all tables? (This will delete all data!)');
      console.log('[DATABASE INIT] Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      setTimeout(() => {
        dropAllTables()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      }, 5000);
      break;

    case 'reset':
      console.log('[DATABASE INIT] Are you sure you want to reset the database? (This will delete all data!)');
      console.log('[DATABASE INIT] Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      setTimeout(() => {
        resetDatabase()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      }, 5000);
      break;

    default:
      console.log('Usage:');
      console.log('  npm run db:init   - Initialize database with schema');
      console.log('  npm run db:drop   - Drop all tables (WARNING: deletes all data!)');
      console.log('  npm run db:reset  - Reset database (drop and reinitialize)');
      process.exit(1);
  }
}

export { initializeDatabase, dropAllTables, resetDatabase };
