import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from './config';
import { Command } from './types/command';
import fs from 'fs';
import path from 'path';

// Create a collection to store commands
const commands = new Collection<string, Command>();

// Load commands
function loadCommands() {
  console.log('[BOT] Loading commands...');
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: Command = require(filePath).default;

    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      console.log(`[BOT] ✓ Loaded command: ${command.data.name}`);
    } else {
      console.log(`[BOT] ✗ Warning: ${filePath} is missing required "data" or "execute" property.`);
    }
  }
  console.log(`[BOT] Successfully loaded ${commands.size} command(s)\n`);
}

// Create Discord client
export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  // Load commands on initialization
  loadCommands();

  // Event: Bot is ready
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[BOT] ✓ Bot is online! Logged in as ${readyClient.user.tag}`);
    console.log(`[BOT] ✓ Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`[BOT] ✓ Ready to handle commands!\n`);
    console.log('========================================');
    console.log('  Bot is now fully operational!');
    console.log('========================================\n');
  });

  // Event: Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`[BOT ERROR] No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
      console.log(`[BOT] Command "${interaction.commandName}" executed by ${interaction.user.tag}`);
    } catch (error) {
      console.error(`[BOT ERROR] Error executing command ${interaction.commandName}:`, error);

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

  // Event: Guild joined
  client.on(Events.GuildCreate, (guild) => {
    console.log(`[BOT] Joined new guild: ${guild.name} (${guild.id})`);
  });

  // Event: Guild left
  client.on(Events.GuildDelete, (guild) => {
    console.log(`[BOT] Left guild: ${guild.name} (${guild.id})`);
  });

  // Error handling
  client.on(Events.Error, (error) => {
    console.error('[BOT ERROR] Discord client error:', error);
  });

  return client;
}

// Start the bot
export async function startBot(): Promise<Client> {
  console.log('[STEP 3/3] Starting Discord bot...');

  const client = createClient();

  try {
    await client.login(config.token);
    return client;
  } catch (error) {
    console.error('[BOT ERROR] ✗ Failed to login to Discord:', error);
    throw error;
  }
}
