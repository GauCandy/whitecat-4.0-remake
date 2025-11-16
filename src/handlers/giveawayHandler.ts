/**
 * Giveaway Button Interaction Handler
 */

import type { ButtonInteraction } from 'discord.js';
import { pool } from '../database/config';
import { botLogger } from '../utils/logger';
import { getGuildLocale } from '../utils/i18n';
import { logGiveawayError } from '../utils/errorHandler';

/**
 * Handle giveaway entry button click
 */
export async function handleGiveawayEntry(interaction: ButtonInteraction): Promise<void> {
  try {
    const messageId = interaction.message.id;

    // Find the giveaway
    const giveawayResult = await pool.query(
      `SELECT g.*, gu.guild_id as guild_discord_id
       FROM giveaways g
       JOIN guilds gu ON g.guild_id = gu.id
       WHERE g.message_id = $1`,
      [messageId]
    );

    if (giveawayResult.rows.length === 0) {
      await interaction.reply({
        content: '❌ This giveaway could not be found.',
        ephemeral: true,
      });
      return;
    }

    const giveaway = giveawayResult.rows[0];

    // Check if giveaway has ended
    if (giveaway.ended) {
      await interaction.reply({
        content: '❌ This giveaway has already ended.',
        ephemeral: true,
      });
      return;
    }

    // Check if giveaway has expired but not yet marked as ended
    if (new Date(giveaway.ends_at) < new Date()) {
      await interaction.reply({
        content: '❌ This giveaway has already ended.',
        ephemeral: true,
      });
      return;
    }

    // Get or create user
    let userResult = await pool.query(
      'SELECT id FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    let userDbId: number;
    if (userResult.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO users (discord_id, username) VALUES ($1, $2) RETURNING id',
        [interaction.user.id, interaction.user.username]
      );
      userDbId = insertResult.rows[0].id;
    } else {
      userDbId = userResult.rows[0].id;
    }

    // Check if user has required role (if specified)
    if (giveaway.required_role_id && interaction.guild) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(giveaway.required_role_id)) {
        await interaction.reply({
          content: `❌ You need the <@&${giveaway.required_role_id}> role to enter this giveaway.`,
          ephemeral: true,
        });
        return;
      }
    }

    // Check account age (if specified)
    if (giveaway.min_account_age_days) {
      const accountAge = Date.now() - interaction.user.createdTimestamp;
      const requiredAge = giveaway.min_account_age_days * 24 * 60 * 60 * 1000;

      if (accountAge < requiredAge) {
        await interaction.reply({
          content: `❌ Your account must be at least ${giveaway.min_account_age_days} days old to enter this giveaway.`,
          ephemeral: true,
        });
        return;
      }
    }

    // Check if user has already entered
    const entryCheck = await pool.query(
      'SELECT id FROM giveaway_entries WHERE giveaway_id = $1 AND user_id = $2',
      [giveaway.id, userDbId]
    );

    if (entryCheck.rows.length > 0) {
      await interaction.reply({
        content: '❌ You have already entered this giveaway!',
        ephemeral: true,
      });
      return;
    }

    // Add entry
    await pool.query(
      'INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES ($1, $2)',
      [giveaway.id, userDbId]
    );

    // Get total entries count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = $1',
      [giveaway.id]
    );

    const totalEntries = parseInt(countResult.rows[0].count);

    await interaction.reply({
      content: `✅ You have successfully entered the giveaway! (Total entries: ${totalEntries})`,
      ephemeral: true,
    });

    botLogger.info(`User ${interaction.user.tag} entered giveaway ${giveaway.id}`);
  } catch (error) {
    const locale = interaction.guildId ? await getGuildLocale(interaction.guildId) : 'en-US';
    const errorMessage = logGiveawayError(
      error,
      undefined,
      interaction.user.id,
      'enter giveaway',
      locale
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
