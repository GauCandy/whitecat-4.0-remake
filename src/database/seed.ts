import { Pool } from 'pg';
import { databaseConfig } from './config';

const pool = new Pool(databaseConfig);

// ============================================
// SEED DATA
// ============================================

// Seed available ports (25565-25664 = 100 ports)
async function seedPorts() {
  console.log('📦 Seeding ports...');

  const START_PORT = 25565;
  const END_PORT = 25664;

  const values: string[] = [];
  for (let port = START_PORT; port <= END_PORT; port++) {
    values.push(`(${port}, FALSE, NULL)`);
  }

  try {
    await pool.query(`
      INSERT INTO ports (port, is_used, hosting_id)
      VALUES ${values.join(', ')}
      ON CONFLICT (port) DO NOTHING
    `);

    const count = END_PORT - START_PORT + 1;
    console.log(`   ✅ Added ${count} ports (${START_PORT}-${END_PORT})`);
  } catch (error) {
    console.error('   ❌ Error seeding ports:', error);
    throw error;
  }
}

// Show hosting pricing (already inserted via schema.sql)
async function showHostingPricing() {
  console.log('📦 Hosting pricing info...');

  try {
    const { rows } = await pool.query<{
      resource_type: string;
      value: number;
      unit: string;
      price_per_month: number;
    }>(`
      SELECT resource_type, value, unit, price_per_month
      FROM hosting_pricing
      ORDER BY resource_type, display_order
    `);

    console.log('\n   RAM Options:');
    rows.filter((r) => r.resource_type === 'ram').forEach((r: typeof rows[0]) => {
      console.log(`   - ${r.value}${r.unit}: ${r.price_per_month.toLocaleString()} coins/month`);
    });

    console.log('\n   CPU Options:');
    rows.filter((r) => r.resource_type === 'cpu').forEach((r: typeof rows[0]) => {
      console.log(`   - ${r.value} ${r.unit}: ${r.price_per_month.toLocaleString()} coins/month`);
    });

    console.log('\n   Storage Options:');
    rows.filter((r) => r.resource_type === 'storage').forEach((r: typeof rows[0]) => {
      console.log(`   - ${r.value}${r.unit}: ${r.price_per_month.toLocaleString()} coins/month`);
    });

    console.log('\n   ✅ Pricing already loaded from schema.sql');
  } catch (error) {
    console.error('   ❌ Error showing pricing:', error);
    throw error;
  }
}

// Seed sample user (for testing)
async function seedTestUser() {
  console.log('📦 Seeding test user...');

  const TEST_USER_ID = '123456789012345678'; // Sample Discord ID

  try {
    // Insert test user
    await pool.query(
      `
      INSERT INTO users (id, username, discriminator, locale)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          discriminator = EXCLUDED.discriminator
    `,
      [TEST_USER_ID, 'TestUser', '0001', 'en']
    );

    // Insert economy data
    await pool.query(
      `
      INSERT INTO user_economy (user_id, coins, points, premium)
      VALUES ($1, 100000, 5000, 10)
      ON CONFLICT (user_id) DO NOTHING
    `,
      [TEST_USER_ID]
    );

    console.log(`   ✅ Test user created (ID: ${TEST_USER_ID})`);
    console.log(`   💰 Balance: 100,000 coins, 5,000 points, 10 premium`);
  } catch (error) {
    console.error('   ❌ Error seeding test user:', error);
    throw error;
  }
}

// Clear all data (dangerous!)
async function clearData() {
  console.log('⚠️  Clearing all data...');

  try {
    await pool.query('TRUNCATE TABLE users CASCADE');
    await pool.query('TRUNCATE TABLE guilds CASCADE');
    await pool.query('TRUNCATE TABLE ports CASCADE');
    await pool.query('TRUNCATE TABLE daily_stats CASCADE');
    await pool.query('TRUNCATE TABLE webhooks CASCADE');

    console.log('   ✅ All data cleared');
  } catch (error) {
    console.error('   ❌ Error clearing data:', error);
    throw error;
  }
}

// Main function
async function main() {
  const command = process.argv[2];

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected!\n');

    switch (command) {
      case 'ports':
        await seedPorts();
        break;

      case 'pricing':
        await showHostingPricing();
        break;

      case 'test-user':
        await seedTestUser();
        break;

      case 'all':
        await seedPorts();
        await showHostingPricing();
        await seedTestUser();
        break;

      case 'clear':
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        readline.question('⚠️  This will delete ALL data. Continue? (yes/no): ', async (answer: string) => {
          if (answer.toLowerCase() === 'yes') {
            await clearData();
          } else {
            console.log('Cancelled.');
          }
          readline.close();
          await pool.end();
          process.exit(0);
        });
        return; // Don't close pool yet

      default:
        console.log('Usage: npm run db:seed <command>\n');
        console.log('Commands:');
        console.log('  ports      - Seed available ports (25565-25664)');
        console.log('  pricing    - Show hosting pricing options');
        console.log('  test-user  - Create test user with balance');
        console.log('  all        - Run all seed scripts');
        console.log('  clear      - Clear all data (dangerous!)');
        process.exit(1);
    }

    console.log('\n✅ Seed completed!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
