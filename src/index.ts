/**
 * Main Entry Point
 *
 * This file orchestrates the initialization of all services in order:
 * 1. Database connection (REQUIRED)
 * 2. Internal API Server (for bot to use)
 * 3. Discord bot
 * 4. Connect bot to public API
 * Future: ffmpeg, render services, etc.
 */

import { Client } from 'discord.js';
import { testConnection, closePool } from './database/pool';
import { startBot } from './bot';
import APIServer from './api/server';
import Logger from './utils/logger';

// Store references to services
let discordClient: Client | null = null;
let apiServer: APIServer | null = null;

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

  // Close API server
  if (apiServer) {
    try {
      Logger.api('Stopping API server...');
      await apiServer.stop();
    } catch (error) {
      Logger.error('Error stopping API server', error);
    }
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
 * Initialize Internal API Server (for bot usage)
 */
async function initializeInternalAPI(): Promise<void> {
  Logger.section('Step 2/4: Internal API Server');
  Logger.blank();

  try {
    apiServer = new APIServer();
    await apiServer.start();
    Logger.blank();
  } catch (error) {
    Logger.error('Failed to start internal API server', error);
    throw error;
  }
}

/**
 * Initialize Discord Bot
 */
async function initializeBot(): Promise<void> {
  Logger.section('Step 3/4: Discord Bot');
  Logger.blank();

  try {
    discordClient = await startBot();
  } catch (error) {
    Logger.error('Failed to start Discord bot', error);
    throw error;
  }
}

/**
 * Connect Bot to Public API
 */
async function connectBotToAPI(): Promise<void> {
  Logger.section('Step 4/4: Connect Bot to Public API');
  Logger.blank();

  try {
    if (discordClient && apiServer) {
      apiServer.setDiscordClient(discordClient);
      Logger.success('Bot connected to public API');
    } else {
      throw new Error('Bot or API server not initialized');
    }
    Logger.blank();
  } catch (error) {
    Logger.error('Failed to connect bot to API', error);
    throw error;
  }
}

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

    // Step 2: Initialize Internal API Server (for bot usage)
    await initializeInternalAPI();

    // Step 3: Initialize Discord Bot
    await initializeBot();

    // Step 4: Connect Bot to Public API
    await connectBotToAPI();

    // Future services
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
    if (apiServer) {
      await apiServer.stop();
    }
    await closePool();

    process.exit(1);
  }
}

// Start the application
main();
