import { pool } from '../database/config';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running migration: 001_add_pterodactyl_user_id.sql');

    const migrationPath = join(__dirname, '../../database/migrations/001_add_pterodactyl_user_id.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
