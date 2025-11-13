import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './config';

// Try multiple possible paths for schema.sql
const possiblePaths = [
  join(__dirname, '../../database/schema.sql'),
  join(process.cwd(), 'database/schema.sql'),
  join(__dirname, '../database/schema.sql'),
];

function loadSchemaFile(): string {
  for (const path of possiblePaths) {
    try {
      return readFileSync(path, 'utf-8');
    } catch (err) {
      // Try next path
      continue;
    }
  }
  throw new Error('Could not find schema.sql file. Tried paths: ' + possiblePaths.join(', '));
}

async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');

    const schema = loadSchemaFile();
    const createSQL = schema.split('-- @create')[1]?.split('-- @drop')[0] || schema;

    await pool.query(createSQL);

    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - user_economy');
    console.log('   - guilds');
    console.log('   - transactions');
    console.log('   - server_nodes');
    console.log('   - hosting_pricing (with default pricing)');
    console.log('   - ports');
    console.log('   - user_hosting');
    console.log('   - webhooks');
    console.log('   - giveaways');
    console.log('   - giveaway_entries');
    console.log('   - statistics');
    console.log('   - command_logs');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

async function dropDatabase() {
  try {
    console.log('⚠️  Dropping all tables...');

    const schema = loadSchemaFile();
    const dropSQL = schema.split('-- @drop')[1]?.split('-- @create')[0] || '';

    await pool.query(dropSQL);

    console.log('✅ All tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    await dropDatabase();
    await initDatabase();
    console.log('✅ Database reset complete!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

async function cleanupUnusedTables() {
  try {
    console.log('🧹 Cleaning up unused tables...');

    // Get all tables currently in database
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const existingTables = result.rows.map((row: any) => row.tablename);
    console.log(`📊 Found ${existingTables.length} tables in database:`, existingTables.join(', '));

    // Get tables defined in schema.sql
    const schema = loadSchemaFile();
    const createSQL = schema.split('-- @create')[1]?.split('-- @drop')[0] || schema;

    // Extract table names from CREATE TABLE statements
    const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)/gi;
    const definedTables: string[] = [];
    let match;

    while ((match = tableRegex.exec(createSQL)) !== null) {
      definedTables.push(match[1]);
    }

    console.log(`📋 Tables defined in schema.sql:`, definedTables.join(', '));

    // Find unused tables (exist in DB but not in schema)
    const unusedTables = existingTables.filter(
      (table: string) => !definedTables.includes(table)
    );

    if (unusedTables.length === 0) {
      console.log('✅ No unused tables found. Database is clean!');
      return;
    }

    console.log(`⚠️  Found ${unusedTables.length} unused table(s):`, unusedTables.join(', '));
    console.log('🗑️  Dropping unused tables...');

    // Drop unused tables
    for (const table of unusedTables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✓ Dropped: ${table}`);
      } catch (error) {
        console.error(`   ✗ Failed to drop ${table}:`, error);
      }
    }

    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning up tables:', error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'init':
        await initDatabase();
        break;
      case 'drop':
        await dropDatabase();
        break;
      case 'reset':
        await resetDatabase();
        break;
      case 'cleanup':
        await cleanupUnusedTables();
        break;
      default:
        console.log('Usage: npm run db:init | db:drop | db:reset | db:cleanup');
        process.exit(1);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { initDatabase, dropDatabase, resetDatabase, cleanupUnusedTables };
