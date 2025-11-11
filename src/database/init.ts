import path from 'path';
import { readFile } from 'fs/promises';
import { Pool } from 'pg';
import { databaseConfig } from './config';

const pool = new Pool(databaseConfig);

// Paths to search for schema.sql
const schemaSearchPaths = [
  path.resolve(__dirname, 'schema.sql'),
  path.resolve(__dirname, '../schema.sql'),
  path.resolve(__dirname, '../../database/schema.sql'),
  path.resolve(process.cwd(), 'database/schema.sql'),
  path.resolve(process.cwd(), 'schema.sql'),
];

type SchemaSection = 'create' | 'drop';
type SchemaCache = Record<SchemaSection, string>;

let schemaCache: SchemaCache | null = null;

async function readSchemaFile(): Promise<string> {
  const tried: string[] = [];

  for (const candidate of schemaSearchPaths) {
    tried.push(candidate);

    try {
      return await readFile(candidate, 'utf8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      if (err.code && err.code !== 'ENOENT') {
        throw new Error(`Failed to read schema file at ${candidate}: ${err.message}`);
      }
    }
  }

  throw new Error(`Unable to locate schema.sql. Looked in: ${tried.join(', ')}`);
}

async function loadSchema(): Promise<SchemaCache> {
  if (schemaCache) {
    return schemaCache;
  }

  const raw = await readSchemaFile();
  const dropMatch = raw.match(/^\s*--\s*@drop\s*$/m);

  if (!dropMatch || dropMatch.index === undefined) {
    throw new Error('schema.sql must include a line containing `-- @drop` to split create/drop sections.');
  }

  const createRaw = raw.slice(0, dropMatch.index);
  const dropRaw = raw.slice(dropMatch.index + dropMatch[0].length);

  const createSQL = createRaw.replace(/^\s*--\s*@create\s*/im, '').trim();
  const dropSQL = dropRaw.trim();

  if (!createSQL) {
    throw new Error('Create SQL section in schema.sql is empty.');
  }

  if (!dropSQL) {
    throw new Error('Drop SQL section in schema.sql is empty.');
  }

  schemaCache = {
    create: createSQL,
    drop: dropSQL,
  };

  return schemaCache;
}

async function getSchemaSQL(section: SchemaSection): Promise<string> {
  const schema = await loadSchema();
  return schema[section];
}

// Initialize database tables
async function initDatabase() {
  console.log('🚀 Initializing database tables...\n');

  try {
    const createSQL = await getSchemaSQL('create');
    await pool.query(createSQL);

    console.log('✅ All tables created successfully!');
    console.log('\n📊 Database schema:');
    console.log('   Core tables:');
    console.log('   - users, user_economy (authentication & wallet)');
    console.log('   - guilds (Discord server settings)');
    console.log('   - transactions (economy history)');
    console.log('\n   Hosting system:');
    console.log('   - hosting_pricing (resource pricing options)');
    console.log('   - user_hosting (user instances - custom config)');
    console.log('   - ports (port pool management)');
    console.log('   - reverse_proxy (domain → port mapping)');
    console.log('\n   Optional features:');
    console.log('   - webhooks & webhook_logs');
    console.log('   - giveaways, giveaway_entries, giveaway_winners');
    console.log('   - daily_stats, command_logs');
    console.log('\n✨ Database is ready!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm run db:seed:all');
    console.log('   2. Or individually:');
    console.log('      - npm run db:seed:ports     (seed ports 25565-25664)');
    console.log('      - npm run db:seed:pricing   (show hosting pricing)');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Drop all database tables
async function dropDatabase() {
  console.log('⚠️  Dropping all database tables...\n');

  try {
    const dropSQL = await getSchemaSQL('drop');
    await pool.query(dropSQL);
    console.log('✅ All tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

// Reset database (drop + init)
async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  try {
    await dropDatabase();
    console.log('');
    await initDatabase();
    console.log('\n✅ Database reset completed!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Main function
async function main() {
  const command = process.argv[2];

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${databaseConfig.host}`);
    console.log(`   Database: ${databaseConfig.database}`);
    console.log(`   User: ${databaseConfig.user}\n`);

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

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
        console.log('');
        console.log('Commands:');
        console.log('  db:init  - Create all database tables');
        console.log('  db:drop  - Drop all database tables');
        console.log('  db:reset - Drop and recreate all tables');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n👋 Database connection closed.');
  }
}

// Run the script
main();
