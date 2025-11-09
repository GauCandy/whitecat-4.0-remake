import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { config } from './config';
import Logger from './utils/logger';
import { commandManager } from './managers/command-manager';
import { cooldownManager } from './managers/cooldown-manager';
import { checkVerificationForSlashCommand, checkVerificationForPrefixCommand } from './middleware/terms-check';
import { guildRepository } from './database/repositories/guild.repository';
import { mapDiscordLocale } from './utils/locale-mapper';

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
  client.once(Events.ClientReady, async (readyClient) => {
    Logger.success(`Bot logged in as ${readyClient.user.tag}`);
    Logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

    // Auto-create guild records for all guilds bot is in
    for (const guild of client.guilds.cache.values()) {
      try {
        const locale = mapDiscordLocale(guild.preferredLocale);
        await guildRepository.getOrCreateGuild(guild.id, locale);
        Logger.debug(`Guild record ensured for: ${guild.name} (${guild.id}) with locale: ${locale}`);
      } catch (error) {
        Logger.error(`Failed to create guild record for ${guild.name}`, error);
      }
    }

    Logger.success('Ready to handle commands!');
  });

  // Event: Bot joins a new guild
  client.on(Events.GuildCreate, async (guild) => {
    try {
      const locale = mapDiscordLocale(guild.preferredLocale);
      await guildRepository.getOrCreateGuild(guild.id, locale);
      Logger.info(`Joined guild: ${guild.name} (${guild.id}) with locale: ${locale}`);
      Logger.info(`Guild count: ${client.guilds.cache.size}`);
    } catch (error) {
      Logger.error(`Failed to create guild record for ${guild.name}`, error);
    }
  });

  // Event: Bot leaves a guild
  client.on(Events.GuildDelete, async (guild) => {
    try {
      await guildRepository.deleteGuild(guild.id);
      Logger.info(`Left guild: ${guild.name} (${guild.id})`);
      Logger.info(`Guild count: ${client.guilds.cache.size}`);
    } catch (error) {
      Logger.error(`Failed to delete guild record for ${guild.name}`, error);
    }
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

        // Check if command is owner only
        if (retryCommand.ownerOnly && interaction.user.id !== config.botOwnerId) {
          await interaction.reply({
            content: '❌ This command can only be used by the bot owner!',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Check cooldown
        const cooldownSeconds = retryCommand.cooldown ?? 0;
        if (cooldownSeconds > 0 && interaction.user.id !== config.botOwnerId) {
          const remaining = cooldownManager.getRemainingCooldown(interaction.user.id, interaction.commandName);
          if (remaining > 0) {
            await interaction.reply({
              content: `⏱️ Please wait ${remaining} more second(s) before using this command again.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
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

        // Set cooldown after successful execution
        if (cooldownSeconds > 0 && interaction.user.id !== config.botOwnerId) {
          cooldownManager.setCooldown(interaction.user.id, interaction.commandName, cooldownSeconds);
        }
      } else {
        // Check if command is owner only
        if (command.ownerOnly && interaction.user.id !== config.botOwnerId) {
          await interaction.reply({
            content: '❌ This command can only be used by the bot owner!',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Check cooldown
        const cooldownSeconds = command.cooldown ?? 0;
        if (cooldownSeconds > 0 && interaction.user.id !== config.botOwnerId) {
          const remaining = cooldownManager.getRemainingCooldown(interaction.user.id, interaction.commandName);
          if (remaining > 0) {
            await interaction.reply({
              content: `⏱️ Please wait ${remaining} more second(s) before using this command again.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        }

        // Check verification before executing (default: 'basic')
        const canExecute = await checkVerificationForSlashCommand(interaction, command.verificationLevel ?? 'basic');
        if (!canExecute) return;

        // Execute with cached command
        if ('executeSlash' in command) {
          await command.executeSlash(interaction);
        } else {
          await command.execute(interaction);
        }

        // Set cooldown after successful execution
        if (cooldownSeconds > 0 && interaction.user.id !== config.botOwnerId) {
          cooldownManager.setCooldown(interaction.user.id, interaction.commandName, cooldownSeconds);
        }
      }

      Logger.debug(`Slash command "/${interaction.commandName}" executed by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error(`Error executing slash command ${interaction.commandName}`, error);

      const errorContent = 'There was an error while executing this command!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorContent, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorContent, flags: MessageFlags.Ephemeral });
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

      // Check if command is owner only
      const isOwnerOnly = 'ownerOnly' in command ? command.ownerOnly : false;
      if (isOwnerOnly && message.author.id !== config.botOwnerId) {
        await message.reply('❌ This command can only be used by the bot owner!');
        return;
      }

      // Check cooldown
      const cooldownSeconds = 'cooldown' in command ? (command.cooldown ?? 0) : 0;
      if (cooldownSeconds > 0 && message.author.id !== config.botOwnerId) {
        const remaining = cooldownManager.getRemainingCooldown(message.author.id, commandName);
        if (remaining > 0) {
          await message.reply(`⏱️ Please wait ${remaining} more second(s) before using this command again.`);
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

      // Set cooldown after successful execution
      if (cooldownSeconds > 0 && message.author.id !== config.botOwnerId) {
        cooldownManager.setCooldown(message.author.id, commandName, cooldownSeconds);
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
