import { pool } from '../database/config';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running migration 004: Auto-Response Tables...');

    // Đọc file migration
    const migrationPath = join(__dirname, '../../database/migrations/004_add_auto_response_tables.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Chạy migration
    await pool.query(sql);

    console.log('✅ Migration 004 completed successfully!');
    console.log('   - Created table: auto_responses');
    console.log('   - Created table: auto_response_blocked_channels');
    console.log('   - Created table: web_sessions');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
