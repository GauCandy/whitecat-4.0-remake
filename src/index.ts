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
import Logger from './utils/logger';

// Store references to services
let discordClient: Client | null = null;

process.on('unhandledRejection', (error) => {
  Logger.error('Unhandled promise rejection', error);
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  Logger.blank();
  Logger.system(`Received ${signal}, shutting down gracefully...`);
  Logger.blank();

  // Close Discord bot
  if (discordClient) {
    Logger.bot('Destroying Discord client...');
    discordClient.destroy();
    Logger.success('Discord client destroyed');
  }

  // Close database connection
  try {
    Logger.database('Closing database connection...');
    await closePool();
    Logger.success('Database connection closed');
  } catch (error) {
    Logger.error('Error closing database', error);
  }

  Logger.blank();
  Logger.success('Graceful shutdown complete');
  Logger.blank();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Initialize Database
 * Database is REQUIRED - if connection fails, the application will not start
 */
async function initializeDatabase(): Promise<void> {
  Logger.section('Step 1/3: Database Connection');

  try {
    Logger.database('Testing connection...');
    const isConnected = await testConnection();

    if (!isConnected) {
      Logger.error('Failed to connect to database');
      Logger.error('Database connection is REQUIRED for this application');
      throw new Error('Database connection failed');
    }

    Logger.success('Connection pool initialized successfully');
    Logger.blank();
  } catch (error) {
    Logger.error('Error during database initialization', error);
    Logger.error('Application cannot start without database');
    throw error;
  }
}

/**
 * Initialize Discord Bot
 */
async function initializeBot(): Promise<void> {
  Logger.section('Step 2/3: Discord Bot');
  Logger.blank();

  try {
    discordClient = await startBot();
  } catch (error) {
    Logger.error('Failed to start Discord bot', error);
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
  // Display startup banner
  Logger.banner();
  Logger.separator();
  Logger.blank();

  try {
    // Step 1: Initialize Database (REQUIRED)
    await initializeDatabase();

    // Step 2: Initialize Discord Bot
    await initializeBot();

    // Step 3: Initialize other services (future)
    // Logger.section('Step 3/3: Additional Services');
    // await initializeWebServer();
    // await initializeFFmpeg();
    // await initializeRenderService();

    // Success summary
    Logger.blank();
    Logger.separator();
    Logger.success('All services started successfully!');
    Logger.separator();
    Logger.blank();

    // Display info
    Logger.table({
      'Status': 'Online',
      'Version': '1.0.0',
      'Node.js': process.version,
      'Platform': process.platform,
    });

    Logger.blank();
    Logger.separator();
    Logger.blank();

  } catch (error) {
    Logger.blank();
    Logger.separator();
    Logger.error('Failed to start application', error);
    Logger.separator();

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
