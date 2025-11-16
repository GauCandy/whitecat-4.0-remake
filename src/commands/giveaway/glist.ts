/**
 * /glist command - List active giveaways
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../database/config';
import type { Command } from '../../types/command';
import type { Giveaway } from '../../types/giveaway';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('glist')
    .setDescription('List all active giveaways in this server')
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Get all active giveaways for this server
      const result = await pool.query<Giveaway & { entry_count: number }>(
        `SELECT g.*, COUNT(ge.id) as entry_count
         FROM giveaways g
         JOIN guilds gu ON g.guild_id = gu.id
         LEFT JOIN giveaway_entries ge ON g.id = ge.giveaway_id
         WHERE gu.guild_id = $1 AND g.ended = false
         GROUP BY g.id
         ORDER BY g.ends_at ASC`,
        [interaction.guildId]
      );

      if (result.rows.length === 0) {
        await interaction.reply({
          content: '📭 There are no active giveaways in this server.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎉 Active Giveaways')
        .setColor(0x00ff00)
        .setTimestamp();

      for (const giveaway of result.rows) {
        const endsAt = new Date(giveaway.ends_at);
        const timeUntil = `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`;

        embed.addFields({
          name: `🎁 ${giveaway.prize}`,
          value:
            `**Message ID:** ${giveaway.message_id}\n` +
            `**Channel:** <#${giveaway.channel_id}>\n` +
            `**Winners:** ${giveaway.winner_count}\n` +
            `**Entries:** ${giveaway.entry_count}\n` +
            `**Ends:** ${timeUntil}`,
          inline: false,
        });
      }

      embed.setFooter({ text: `${result.rows.length} active giveaway(s)` });

      await interaction.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('Error listing giveaways:', error);
      await interaction.reply({
        content: '❌ An error occurred while listing giveaways.',
        ephemeral: true,
      });
    }
  },
};

export default command;
