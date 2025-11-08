/**
 * Bot Ban Info Command
 *
 * View ban information and history for a user
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

const botbaninfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('botbaninfo')
    .setDescription('View ban information and history for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check ban info')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  ownerOnly: true, // Only bot owner can view ban information

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);

      // Get active ban
      const activeBan = await banRepository.getActiveBan(targetUser.id);

      // Get ban history
      const history = await banRepository.getUserBanHistory(targetUser.id);

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(activeBan ? 0xFF0000 : 0x808080)
        .setTitle(`Ban Info: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Bot Ban System' });

      // Add active ban info
      if (activeBan) {
        embed.setDescription('⛔ **User is currently banned from the bot**');
        embed.addFields(
          { name: 'Ban Reason', value: activeBan.reason || 'No reason provided' },
          { name: 'Banned On', value: `<t:${Math.floor(activeBan.banned_at.getTime() / 1000)}:F>`, inline: true },
          { name: 'Banned By', value: activeBan.banned_by ? `<@${activeBan.banned_by}>` : 'Unknown', inline: true },
          { name: 'Expires', value: activeBan.expires_at ? `<t:${Math.floor(activeBan.expires_at.getTime() / 1000)}:R>` : 'Never (Permanent)', inline: true }
        );
      } else {
        embed.setDescription('✅ **User is not currently banned**');
      }

      // Add ban history
      if (history.length > 0) {
        const historyText = history.slice(0, 5).map((ban, index) => {
          const status = ban.is_active ? '🔴 Active' : '✅ Lifted';
          const date = `<t:${Math.floor(ban.banned_at.getTime() / 1000)}:d>`;
          const reason = ban.reason || 'No reason';
          return `${index + 1}. ${status} | ${date} | ${reason}`;
        }).join('\n');

        embed.addFields({
          name: `Ban History (${history.length} total)`,
          value: historyText || 'No bans'
        });

        if (history.length > 5) {
          embed.addFields({
            name: '\u200B',
            value: `*Showing 5 of ${history.length} bans*`
          });
        }
      } else {
        embed.addFields({
          name: 'Ban History',
          value: 'This user has never been banned'
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in botbaninfo command:', error);

      const errorMessage = 'An error occurred while fetching ban information.';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

export default botbaninfoCommand;
