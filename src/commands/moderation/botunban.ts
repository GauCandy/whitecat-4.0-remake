/**
 * Bot Unban Command
 *
 * Unbans user from bot (removes bot ban)
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

const botunbanCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('botunban')
    .setDescription('Unban user from the bot (remove bot ban)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unban from bot')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  ownerOnly: true, // Only bot owner can unban users from the bot

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);

      // Check if user is banned
      const isBanned = await banRepository.isUserBanned(targetUser.id);
      if (!isBanned) {
        await interaction.reply({
          content: `❌ ${targetUser.tag} is not banned from the bot!`,
          ephemeral: true
        });
        return;
      }

      // Get ban info before unbanning
      const activeBan = await banRepository.getActiveBan(targetUser.id);

      // Unban user
      await banRepository.unbanUser({
        discord_id: targetUser.id,
        unbanned_by: interaction.user.id,
      });

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ User Unbanned from Bot')
        .setDescription(`${targetUser.tag} has been unbanned from the bot.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Unbanned by', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Bot Ban System' });

      // Add original ban info if available
      if (activeBan) {
        embed.addFields(
          { name: 'Original Ban Reason', value: activeBan.reason || 'No reason provided' },
          { name: 'Was Banned On', value: `<t:${Math.floor(activeBan.banned_at.getTime() / 1000)}:F>` }
        );
      }

      await interaction.reply({ embeds: [embed] });

      // Try to DM user (optional)
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('You have been unbanned from the bot')
          .setDescription('You can now use bot commands again.')
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        // User has DMs disabled or blocked bot
      }

    } catch (error) {
      console.error('Error in botunban command:', error);

      const errorMessage = 'An error occurred while unbanning the user.';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

export default botunbanCommand;
