import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import type { ExtendedClient } from './types/client';
import type { Command } from './types/command';

// Load environment variables
config();

// Create Discord client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
}) as ExtendedClient;

// Initialize collections
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

// Startup function
async function start(): Promise<void> {
  try {
    logger.info('🚀 Starting WhiteCat Bot...');

    // Load commands
    await loadCommands(client);

    // Load events
    await loadEvents(client);

    // Login to Discord
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN is not defined in .env file');
    }

    await client.login(token);

    logger.info('✅ Bot started successfully!');
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Global error handling
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Start the bot
void start();
