import { Collection } from 'discord.js';
import type { Event } from '../types/event';
import type { ExtendedClient } from '../types/client';
import { botLogger } from '../utils/logger';
import { checkAuthorization, registerUser } from '../middlewares/authorization';

const event: Event<'interactionCreate'> = {
  name: 'interactionCreate',

  async execute(interaction) {
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
          ephemeral: true,
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
        interaction.user.username,
        interaction.user.discriminator,
        interaction.user.avatar
      );

      // Check if user is authorized (requires: identify + applications.commands + email)
      const isAuthorized = await checkAuthorization(interaction);
      if (!isAuthorized) {
        return; // Authorization middleware already sent response
      }
    }

    // Execute command
    try {
      botLogger.info(
        `Command executed: ${command.data.name} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`
      );
      await command.execute(interaction);
    } catch (error) {
      botLogger.error(`Error executing command ${command.data.name}:`, error);

      const errorMessage = {
        content: '❌ There was an error executing this command!',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

export default event;
