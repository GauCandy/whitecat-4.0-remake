/**
 * Script để tạo web admin mới
 * Usage: npx ts-node src/scripts/create-admin.ts <username> <password> [role]
 */

import { config } from 'dotenv';
config();

import { pool } from '../database/config';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function createAdmin() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx ts-node src/scripts/create-admin.ts <username> <password> [role]');
    console.log('');
    console.log('Roles:');
    console.log('  super_admin - Full access to all guilds');
    console.log('  admin       - Access to assigned guild only (default)');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node src/scripts/create-admin.ts admin MySecurePass123 super_admin');
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];
  const role = args[2] || 'super_admin';

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    process.exit(1);
  }

  if (!['super_admin', 'admin', 'moderator'].includes(role)) {
    console.error('Error: Invalid role. Use: super_admin, admin, or moderator');
    process.exit(1);
  }

  try {
    // Kiểm tra username đã tồn tại chưa
    const existing = await pool.query('SELECT id FROM web_admins WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      console.error(`Error: Username "${username}" already exists`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Tạo admin (guild_id = null cho super_admin)
    const guildId = role === 'super_admin' ? null : null; // Có thể thêm parameter sau

    const result = await pool.query(
      `INSERT INTO web_admins (username, password_hash, guild_id, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role`,
      [username, passwordHash, guildId, role]
    );

    const admin = result.rows[0];

    console.log('');
    console.log('Admin created successfully!');
    console.log('');
    console.log('Details:');
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Role:     ${admin.role}`);
    console.log('');
    console.log('You can now login at: http://localhost:3000/dashboard/login');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
