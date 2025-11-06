/**
 * Main Entry Point
 *
 * This file orchestrates the initialization of all services:
 * - Database connection
 * - Discord bot
 * - Future: Web API, ffmpeg, render services, etc.
 */

import { Client } from 'discord.js';
import { testConnection, closePool } from './database/pool';
import { startBot } from './bot';

// Store references to services
let discordClient: Client | null = null;

process.on('unhandledRejection', (error) => {
  console.error('[ERROR] Unhandled promise rejection:', error);
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...\n`);

  // Close Discord bot
  if (discordClient) {
    console.log('[SHUTDOWN] Destroying Discord client...');
    discordClient.destroy();
    console.log('[SHUTDOWN] ✓ Discord client destroyed');
  }

  // Close database connection
  try {
    console.log('[SHUTDOWN] Closing database connection...');
    await closePool();
    console.log('[SHUTDOWN] ✓ Database connection closed');
  } catch (error) {
    console.error('[SHUTDOWN ERROR] Error closing database:', error);
  }

  console.log('[SHUTDOWN] ✓ Graceful shutdown complete\n');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Initialize Database
 * Database is REQUIRED - if connection fails, the application will not start
 */
async function initializeDatabase(): Promise<void> {
  console.log('[STEP 1/3] Initializing database connection...');

  try {
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error('[DATABASE] ✗ Failed to connect to database');
      console.error('[DATABASE] ✗ Database connection is REQUIRED for this application');
      throw new Error('Database connection failed');
    }

    console.log('[DATABASE] ✓ Connection pool initialized successfully\n');
  } catch (error) {
    console.error('[DATABASE] ✗ Error during database initialization:', error);
    console.error('[DATABASE] ✗ Application cannot start without database');
    throw error;
  }
}

/**
 * Initialize Discord Bot
 */
async function initializeBot(): Promise<void> {
  console.log('[STEP 2/3] Initializing Discord bot...\n');

  try {
    discordClient = await startBot();
  } catch (error) {
    console.error('[BOT] ✗ Failed to start Discord bot');
    throw error;
  }
}

/**
 * Initialize Web Services (Future)
 * Uncomment when ready to add web API
 */
// async function initializeWebServer(): Promise<void> {
//   console.log('[STEP 4/4] Initializing web server...');
//   // TODO: Add Express/Fastify server here
//   // TODO: Add API routes
//   console.log('[WEB] ✓ Web server started on port 3000\n');
// }

/**
 * Main Application Entry Point
 */
async function main() {
  console.log('\n========================================');
  console.log('  Application Starting...');
  console.log('========================================\n');

  try {
    // Step 1: Initialize Database (REQUIRED)
    await initializeDatabase();

    // Step 2: Initialize Discord Bot
    await initializeBot();

    // Step 3: Initialize other services (future)
    // await initializeWebServer();
    // await initializeFFmpeg();
    // await initializeRenderService();

    console.log('[SUCCESS] All services started successfully!\n');
  } catch (error) {
    console.error('\n[FATAL ERROR] Failed to start application:', error);

    // Cleanup on failure
    if (discordClient) {
      discordClient.destroy();
    }
    await closePool();

    process.exit(1);
  }
}

// Start the application
main();
