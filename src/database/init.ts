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
      default:
        console.log('Usage: npm run db:init | db:drop | db:reset');
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

export { initDatabase, dropDatabase, resetDatabase };
