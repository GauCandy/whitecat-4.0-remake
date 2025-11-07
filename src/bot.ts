import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config } from './config';
import Logger from './utils/logger';
import { commandManager } from './managers/command-manager';
import { checkVerificationForSlashCommand, checkVerificationForPrefixCommand } from './middleware/terms-check';

// Create Discord client
export async function createClient(): Promise<Client> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  // Initialize command manager (with lazy loading)
  await commandManager.initialize();

  // Event: Bot is ready
  client.once(Events.ClientReady, (readyClient) => {
    Logger.success(`Bot logged in as ${readyClient.user.tag}`);
    Logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    Logger.success('Ready to handle commands!');
  });

  // Event: Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      // Lazy load command
      const command = commandManager.getSlashCommand(interaction.commandName);

      if (!command) {
        // Command might not be loaded yet, try to load it
        await commandManager.getCommand(interaction.commandName);
        const retryCommand = commandManager.getSlashCommand(interaction.commandName);

        if (!retryCommand) {
          Logger.error(`No command matching ${interaction.commandName} was found`);
          return;
        }

        // Check verification before executing (default: 'basic')
        const canExecute = await checkVerificationForSlashCommand(interaction, retryCommand.verificationLevel ?? 'basic');
        if (!canExecute) return;

        // Execute with newly loaded command
        if ('executeSlash' in retryCommand) {
          await retryCommand.executeSlash(interaction);
        } else {
          await retryCommand.execute(interaction);
        }
      } else {
        // Check verification before executing (default: 'basic')
        const canExecute = await checkVerificationForSlashCommand(interaction, command.verificationLevel ?? 'basic');
        if (!canExecute) return;

        // Execute with cached command
        if ('executeSlash' in command) {
          await command.executeSlash(interaction);
        } else {
          await command.execute(interaction);
        }
      }

      Logger.debug(`Slash command "/${interaction.commandName}" executed by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error(`Error executing slash command ${interaction.commandName}`, error);

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

  // Event: Handle prefix commands
  client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if message starts with prefix
    if (!message.content.startsWith(config.prefix)) return;

    // Parse command and arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    try {
      // Lazy load command
      let command = commandManager.getPrefixCommand(commandName);

      if (!command) {
        // Command might not be loaded yet, try to load it
        await commandManager.getCommand(commandName);
        command = commandManager.getPrefixCommand(commandName);

        if (!command) {
          // Command doesn't exist
          return;
        }
      }

      // Check verification before executing (default: 'basic')
      const verificationLevel = 'verificationLevel' in command ? (command.verificationLevel ?? 'basic') : 'basic';
      const canExecute = await checkVerificationForPrefixCommand(message, verificationLevel);
      if (!canExecute) return;

      // Execute command
      if ('executePrefix' in command) {
        // Hybrid command
        await command.executePrefix(message, args);
      } else {
        // Prefix-only command
        await command.execute(message, args);
      }

      Logger.debug(`Prefix command "${config.prefix}${commandName}" executed by ${message.author.tag}`);
    } catch (error) {
      Logger.error(`Error executing prefix command ${commandName}`, error);

      try {
        await message.reply({
          content: 'There was an error while executing this command!',
        });
      } catch (replyError) {
        Logger.error('Failed to send error message', replyError);
      }
    }
  });

  // Event: Guild joined
  client.on(Events.GuildCreate, (guild) => {
    Logger.success(`Joined new guild: ${guild.name} (ID: ${guild.id})`);
  });

  // Event: Guild left
  client.on(Events.GuildDelete, (guild) => {
    Logger.info(`Left guild: ${guild.name} (ID: ${guild.id})`);
  });

  // Error handling
  client.on(Events.Error, (error) => {
    Logger.error('Discord client error', error);
  });

  return client;
}

// Start the bot
export async function startBot(): Promise<Client> {
  Logger.bot('Connecting to Discord...');

  const client = await createClient();

  try {
    await client.login(config.token);
    return client;
  } catch (error) {
    Logger.error('Failed to login to Discord', error);
    throw error;
  }
}
