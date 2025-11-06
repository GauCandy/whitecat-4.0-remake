import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from './config';
import { Command } from './types/command';
import { testConnection, closePool } from './database/pool';
import fs from 'fs';
import path from 'path';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Create a collection to store commands
const commands = new Collection<string, Command>();

// Load commands function
function loadCommands() {
  console.log('[BOT] Loading commands...');
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: Command = require(filePath).default;

    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      console.log(`[BOT] Loaded command: ${command.data.name}`);
    } else {
      console.log(`[BOT WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }
  console.log(`[BOT] Successfully loaded ${commands.size} command(s)`);
}

// Event: Bot is ready
client.once(Events.ClientReady, (readyClient) => {
  console.log(`[BOT SUCCESS] Bot is online! Logged in as ${readyClient.user.tag}`);
  console.log(`[BOT] Serving ${client.guilds.cache.size} guild(s)`);
  console.log('[BOT] Ready to handle commands!');
});

// Event: Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
    console.log(`[INFO] Command ${interaction.commandName} executed by ${interaction.user.tag}`);
  } catch (error) {
    console.error(`[ERROR] Error executing command ${interaction.commandName}:`, error);

    const errorMessage = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('[ERROR] Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[ERROR] Unhandled promise rejection:', error);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[INFO] Received ${signal}, shutting down gracefully...`);

  // Close database connection
  try {
    await closePool();
    console.log('[DATABASE] Connection pool closed');
  } catch (error) {
    console.error('[DATABASE ERROR] Error closing pool:', error);
  }

  // Destroy Discord client
  client.destroy();
  console.log('[INFO] Discord client destroyed');

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Main initialization function
async function main() {
  console.log('========================================');
  console.log('  Discord Bot Starting...');
  console.log('========================================\n');

  // Step 1: Initialize database connection
  console.log('[STEP 1/3] Initializing database connection...');
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('[DATABASE] ✓ Connection pool initialized successfully\n');
    } else {
      console.error('[DATABASE] ✗ Failed to connect to database');
      console.error('[DATABASE] Bot will continue without database features\n');
    }
  } catch (error) {
    console.error('[DATABASE] ✗ Error during database initialization:', error);
    console.error('[DATABASE] Bot will continue without database features\n');
  }

  // Step 2: Load commands
  console.log('[STEP 2/3] Loading commands...');
  loadCommands();
  console.log('');

  // Step 3: Login to Discord
  console.log('[STEP 3/3] Logging in to Discord...');
  try {
    await client.login(config.token);
  } catch (error) {
    console.error('[BOT ERROR] Failed to login:', error);
    await closePool();
    process.exit(1);
  }
}

// Start the bot
main().catch((error) => {
  console.error('[FATAL ERROR] Failed to start bot:', error);
  process.exit(1);
});
