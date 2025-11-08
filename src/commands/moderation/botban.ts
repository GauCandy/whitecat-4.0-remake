/**
 * Bot Ban Command
 *
 * Bans user from using bot (not Discord server ban)
 * Only bot admins can use this command
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { SlashCommand } from '../../types/command';
import { banRepository } from '../../database/repositories/ban.repository';
import { userRepository } from '../../database/repositories/user.repository';

const botbanCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('botban')
    .setDescription('Ban user from using the bot (bot-specific ban, not Discord server ban)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban from bot')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Ban reason')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Ban duration (e.g., 7d, 1h, permanent)')
        .setRequired(false)
        .addChoices(
          { name: '1 hour', value: '1h' },
          { name: '1 day', value: '1d' },
          { name: '7 days', value: '7d' },
          { name: '30 days', value: '30d' },
          { name: 'Permanent', value: 'permanent' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  ownerOnly: true, // Only bot owner can ban users from using the bot

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const duration = interaction.options.getString('duration') || 'permanent';

      // Prevent self-ban
      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: '❌ You cannot ban yourself!',
          ephemeral: true
        });
        return;
      }

      // Prevent banning bots
      if (targetUser.bot) {
        await interaction.reply({
          content: '❌ Cannot ban bots!',
          ephemeral: true
        });
        return;
      }

      // Check if user is already banned
      const isAlreadyBanned = await banRepository.isUserBanned(targetUser.id);
      if (isAlreadyBanned) {
        await interaction.reply({
          content: `❌ ${targetUser.tag} is already banned from the bot!`,
          ephemeral: true
        });
        return;
      }

      // Calculate expiration time
      let expiresAt: Date | null = null;
      let durationText = 'Permanent';

      if (duration !== 'permanent') {
        expiresAt = new Date();

        if (duration === '1h') {
          expiresAt.setHours(expiresAt.getHours() + 1);
          durationText = '1 hour';
        } else if (duration === '1d') {
          expiresAt.setDate(expiresAt.getDate() + 1);
          durationText = '1 day';
        } else if (duration === '7d') {
          expiresAt.setDate(expiresAt.getDate() + 7);
          durationText = '7 days';
        } else if (duration === '30d') {
          expiresAt.setDate(expiresAt.getDate() + 30);
          durationText = '30 days';
        }
      }

      // Ensure user exists in database
      await userRepository.getOrCreateUser({ discord_id: targetUser.id });

      // Ban user
      await banRepository.banUser({
        discord_id: targetUser.id,
        reason: reason,
        banned_by: interaction.user.id,
        expires_at: expiresAt,
      });

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔨 User Banned from Bot')
        .setDescription(`${targetUser.tag} has been banned from using the bot.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Duration', value: durationText, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Banned by', value: `${interaction.user.tag}`, inline: true },
          { name: 'Expires', value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : 'Never', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Bot Ban System' });

      await interaction.reply({ embeds: [embed] });

      // Try to DM user (optional)
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('You have been banned from using the bot')
          .setDescription('You can no longer use bot commands.')
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Duration', value: durationText },
            { name: 'Expires', value: expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : 'Never' }
          )
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        // User has DMs disabled or blocked bot
      }

    } catch (error) {
      console.error('Error in botban command:', error);

      const errorMessage = 'An error occurred while banning the user.';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

export default botbanCommand;
