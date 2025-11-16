import { pool } from './config';

async function seedPorts() {
  console.log('📦 Seeding ports (25565-25664)...');

  const ports: number[] = [];
  for (let port = 25565; port <= 25664; port++) {
    ports.push(port);
  }

  const values = ports.map((port) => `(${port})`).join(',');
  const query = `
    INSERT INTO ports (port)
    VALUES ${values}
    ON CONFLICT (port) DO NOTHING;
  `;

  await pool.query(query);
  console.log(`✅ Inserted ${ports.length} ports`);
}

async function seedHostingPricing() {
  console.log('💰 Checking hosting pricing...');

  const result = await pool.query('SELECT COUNT(*) FROM hosting_pricing');
  const count = parseInt(result.rows[0].count);

  if (count > 0) {
    console.log(`✅ Hosting pricing already seeded (${count} entries)`);
  } else {
    console.log('⚠️  No hosting pricing found. It should be auto-seeded by schema.sql');
  }
}

async function seedTestUser() {
  console.log('👤 Creating test user...');

  // Check if test user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE discord_id = $1',
    ['904037527739043861'] // Bot owner ID from .env
  );

  if (existingUser.rows.length > 0) {
    console.log('✅ Test user already exists');
    return;
  }

  // Create test user
  const userResult = await pool.query(
    `INSERT INTO users (discord_id, username, discriminator, avatar)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['904037527739043861', 'TestUser', '0', null]
  );

  const userId = userResult.rows[0].id;

  // Create user economy with starting balance
  await pool.query(
    `INSERT INTO user_economy (user_id, currency_id, balance)
     VALUES ($1, $2, $3)`,
    [userId, 1, 100000] // 100,000 starting coins (currency_id = 1 = COIN)
  );

  console.log('✅ Test user created with 100,000 coins');
}

async function seedServerNodes() {
  console.log('🖥️  Creating default server node...');

  const existingNode = await pool.query(
    'SELECT id FROM server_nodes WHERE name = $1',
    ['VN1']
  );

  if (existingNode.rows.length > 0) {
    console.log('✅ Server node already exists');
    return;
  }

  await pool.query(
    `INSERT INTO server_nodes (name, location, is_active, max_servers)
     VALUES ($1, $2, $3, $4)`,
    ['VN1', 'Vietnam', true, 100]
  );

  console.log('✅ Default server node created');
}

async function unseedDatabase() {
  console.log('🧹 Removing seeded data...');

  // Remove test user
  console.log('👤 Removing test user...');
  const userResult = await pool.query(
    'DELETE FROM users WHERE discord_id = $1 RETURNING id',
    ['904037527739043861']
  );

  if (userResult.rowCount > 0) {
    console.log('   ✓ Test user removed');
  } else {
    console.log('   ℹ Test user not found (already removed)');
  }

  // Remove test server node
  console.log('🖥️  Removing default server node...');
  const nodeResult = await pool.query(
    'DELETE FROM server_nodes WHERE name = $1',
    ['VN1']
  );

  if (nodeResult.rowCount > 0) {
    console.log('   ✓ Server node VN1 removed');
  } else {
    console.log('   ℹ Server node VN1 not found (already removed)');
  }

  // Clear ports (optional - ports can be reused)
  console.log('📦 Clearing ports...');
  const portResult = await pool.query('DELETE FROM ports WHERE is_in_use = false');
  console.log(`   ✓ Cleared ${portResult.rowCount} unused ports`);

  console.log('\n✅ Seeded data removed successfully!');
}

async function main() {
  const command = process.argv[2];

  try {
    if (command === 'unseed') {
      console.log('🗑️  Starting database unseed...\n');
      await unseedDatabase();
    } else {
      console.log('🌱 Starting database seed...\n');

      await seedPorts();
      await seedHostingPricing();
      await seedTestUser();
      await seedServerNodes();

      console.log('\n✅ Database seeding completed!');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedPorts, seedHostingPricing, seedTestUser, seedServerNodes, unseedDatabase };
