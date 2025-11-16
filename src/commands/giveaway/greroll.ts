/**
 * /greroll command - Reroll giveaway winners
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { pool } from '../../database/config';
import type { Command } from '../../types/command';
import type { ExtendedClient } from '../../types/client';
import type { Giveaway } from '../../types/giveaway';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll winners for an ended giveaway')
    .addStringOption(option =>
      option
        .setName('message_id')
        .setDescription('The message ID of the giveaway to reroll')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const messageId = interaction.options.getString('message_id', true);

    try {
      // Find the giveaway
      const result = await pool.query<Giveaway>(
        `SELECT g.* FROM giveaways g
         JOIN guilds gu ON g.guild_id = gu.id
         WHERE g.message_id = $1 AND gu.guild_id = $2`,
        [messageId, interaction.guildId]
      );

      if (result.rows.length === 0) {
        await interaction.reply({
          content: '❌ Giveaway not found in this server.',
          ephemeral: true,
        });
        return;
      }

      const giveaway = result.rows[0];

      if (!giveaway.ended) {
        await interaction.reply({
          content: '❌ This giveaway has not ended yet. Use `/gend` to end it first.',
          ephemeral: true,
        });
        return;
      }

      // Reroll using the manager
      const client = interaction.client as ExtendedClient;
      const giveawayManager = (client as any).giveawayManager;

      if (!giveawayManager) {
        await interaction.reply({
          content: '❌ Giveaway manager is not initialized.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: '🔄 Rerolling winners...',
        ephemeral: true,
      });

      const winners = await giveawayManager.rerollWinners(giveaway.id);

      if (winners.length === 0) {
        await interaction.editReply({
          content: '❌ No entries found for this giveaway.',
        });
        return;
      }

      await interaction.editReply({
        content: `✅ Rerolled ${winners.length} new winner(s)!`,
      });
    } catch (error) {
      console.error('Error rerolling giveaway:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '❌ An error occurred while rerolling the giveaway.',
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred while rerolling the giveaway.',
          ephemeral: true,
        });
      }
    }
  },
};

export default command;
