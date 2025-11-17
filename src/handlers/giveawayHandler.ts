/**
 * Giveaway Button Interaction Handler
 */

import { MessageFlags, type ButtonInteraction } from 'discord.js';
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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const giveaway = giveawayResult.rows[0];

    // Check if giveaway has ended
    if (giveaway.ended) {
      await interaction.reply({
        content: '❌ This giveaway has already ended.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if giveaway has expired but not yet marked as ended
    if (new Date(giveaway.ends_at) < new Date()) {
      await interaction.reply({
        content: '❌ This giveaway has already ended.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Get or create user (upsert)
    const userResult = await pool.query(
      `INSERT INTO users (discord_id, username, last_seen)
       VALUES ($1, $2, NOW())
       ON CONFLICT (discord_id) DO UPDATE SET
         username = EXCLUDED.username,
         last_seen = NOW()
       RETURNING id`,
      [interaction.user.id, interaction.user.username]
    );
    const userDbId = userResult.rows[0].id;

    // Check if user has required role (if specified)
    if (giveaway.required_role_id && interaction.guild) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(giveaway.required_role_id)) {
        await interaction.reply({
          content: `❌ You need the <@&${giveaway.required_role_id}> role to enter this giveaway.`,
          flags: MessageFlags.Ephemeral,
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
        flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
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
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
