import { Collection, MessageFlags } from 'discord.js';
import type { Event } from '../types/event';
import type { ExtendedClient } from '../types/client';
import { botLogger } from '../utils/logger';
import { checkAuthorization, registerUser } from '../middlewares/authorization';
import {
  handleLanguageSelect,
  handleDefaultLanguageButton,
  handleCustomPrefixButton,
  handleDefaultPrefixButton,
  handleCustomPrefixModal
} from '../handlers/setupHandler';
import { handleGiveawayEntry } from '../handlers/giveawayHandler';

const event: Event<'interactionCreate'> = {
  name: 'interactionCreate',

  async execute(interaction) {
    // Handle string select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'setup_language') {
        await handleLanguageSelect(interaction);
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Giveaway entry handler
      if (interaction.customId === 'giveaway_enter') {
        await handleGiveawayEntry(interaction);
        return;
      }

      // Setup handlers
      if (interaction.customId === 'setup_default_language') {
        await handleDefaultLanguageButton(interaction);
        return;
      }
      if (interaction.customId === 'setup_custom_prefix') {
        await handleCustomPrefixButton(interaction);
        return;
      }
      if (interaction.customId === 'setup_default_prefix') {
        await handleDefaultPrefixButton(interaction);
        return;
      }

      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      // Setup modal handler
      if (interaction.customId.startsWith('setup_custom_prefix_modal_')) {
        await handleCustomPrefixModal(interaction);
        return;
      }

      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      botLogger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    // Cooldown check
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name)!;
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        await interaction.reply({
          content: `⏳ Please wait ${timeLeft.toFixed(1)} more seconds before using \`/${command.data.name}\` again.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Authorization check
    // Skip auth ONLY if explicitly requiresAuth = false
    const shouldCheckAuth = command.requiresAuth !== false;

    if (shouldCheckAuth) {
      // Register user if not exists
      await registerUser(
        interaction.user.id,
        interaction.user.username
      );

      // Check if user is authorized (requires: identify + applications.commands + email)
      const isAuthorized = await checkAuthorization(interaction);
      if (!isAuthorized) {
        return; // Authorization middleware already sent response
      }
    }

    // Execute command
    try {
      await command.execute(interaction);
    } catch (error) {
      botLogger.error(`Error executing command ${command.data.name}:`, error);

      const errorContent = '❌ There was an error executing this command!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorContent,
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: errorContent,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
};

export default event;
