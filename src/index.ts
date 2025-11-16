import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { logger, botLogger, webLogger } from './utils/logger';
import { loadCommands } from './handlers/commandHandler';
import { loadTextCommands } from './handlers/textCommandHandler';
import { loadEvents } from './handlers/eventHandler';
import { initI18n } from './utils/i18n';
import { GiveawayManager } from './managers/giveawayManager';
import app from './web/server';
import type { ExtendedClient } from './types/client';
import type { Command } from './types/command';
import type { TextCommand } from './types/textCommand';

// Load environment variables
config();

// Web server configuration
const PORT = parseInt(process.env.API_PORT || '3000', 10);
const HOST = '0.0.0.0';

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
client.textCommands = new Collection<string, TextCommand>();
client.cooldowns = new Collection<string, Collection<string, number>>();

// Initialize giveaway manager
const giveawayManager = new GiveawayManager(client);
(client as any).giveawayManager = giveawayManager;

// Startup function
async function start(): Promise<void> {
  try {
    logger.info('🚀 Starting WhiteCat Bot & OAuth Server...');

    // Start OAuth callback server
    app.listen(PORT, HOST, () => {
      webLogger.info(`🌐 OAuth server listening on ${HOST}:${PORT} (http://localhost:${PORT})`);
    });

    // Initialize i18n system
    initI18n();

    // Load slash commands
    await loadCommands(client);

    // Load text/prefix commands
    await loadTextCommands(client);

    // Load events
    await loadEvents(client);

    // Login to Discord
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN is not defined in .env file');
    }

    await client.login(token);

    botLogger.info('✅ Bot started successfully!');
  } catch (error) {
    logger.error('❌ Failed to start:', error);
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

// Start the bot
void start();
