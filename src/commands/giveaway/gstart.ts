/**
 * /gstart command - Start a new giveaway
 */

import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { pool } from '../../database/config';
import { getGuildLocale } from '../../utils/i18n';
import { logGiveawayError } from '../../utils/errorHandler';
import type { Command } from '../../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('gstart')
    .setDescription('Start a new giveaway')
    .addStringOption(option =>
      option
        .setName('prize')
        .setDescription('The prize for the giveaway')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes (default: 60)')
        .setMinValue(1)
        .setMaxValue(10080) // 1 week
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('winners')
        .setDescription('Number of winners (default: 1)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('required_role')
        .setDescription('Required role to participate')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('min_account_age')
        .setDescription('Minimum account age in days (default: none)')
        .setMinValue(0)
        .setMaxValue(365)
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('prevent_alts')
        .setDescription('Prevent clone/alt accounts from entering (checks IP duplicates)')
        .setRequired(false)
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

    const prize = interaction.options.getString('prize', true);
    const duration = interaction.options.getInteger('duration') ?? 60;
    const winnerCount = interaction.options.getInteger('winners') ?? 1;
    const requiredRole = interaction.options.getRole('required_role');
    const minAccountAge = interaction.options.getInteger('min_account_age');
    const preventAlts = interaction.options.getBoolean('prevent_alts') ?? false;

    try {
      // Get or create guild
      let guildResult = await pool.query(
        'SELECT id FROM guilds WHERE guild_id = $1',
        [interaction.guildId]
      );

      let guildDbId: number;
      if (guildResult.rows.length === 0) {
        const insertResult = await pool.query(
          'INSERT INTO guilds (guild_id) VALUES ($1) RETURNING id',
          [interaction.guildId]
        );
        guildDbId = insertResult.rows[0].id;
      } else {
        guildDbId = guildResult.rows[0].id;
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

      // Calculate end time
      const endsAt = new Date(Date.now() + duration * 60 * 1000);

      // Create giveaway embed
      const embed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winnerCount}\n` +
          `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n` +
          `**Hosted by:** ${interaction.user}\n\n` +
          (requiredRole ? `**Required Role:** ${requiredRole}\n` : '') +
          (minAccountAge ? `**Min Account Age:** ${minAccountAge} days\n` : '') +
          (preventAlts ? `**🛡️ Clone Protection:** Enabled\n` : '') +
          `\nClick the button below to enter!`
        )
        .setColor(0x00ff00)
        .setFooter({ text: `${winnerCount} winner(s) | Ends` })
        .setTimestamp(endsAt);

      const button = new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('🎉 Enter Giveaway')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Send giveaway message
      const giveawayMessage = await interaction.channel?.send({
        embeds: [embed],
        components: [row],
      });

      if (!giveawayMessage) {
        await interaction.reply({
          content: '❌ Failed to create giveaway message.',
          ephemeral: true,
        });
        return;
      }

      // Insert into database
      await pool.query(
        `INSERT INTO giveaways
         (guild_id, channel_id, message_id, prize, winner_count, required_role_id, min_account_age_days, prevent_alts, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          guildDbId,
          interaction.channelId,
          giveawayMessage.id,
          prize,
          winnerCount,
          requiredRole?.id || null,
          minAccountAge || null,
          preventAlts,
          endsAt,
          userDbId,
        ]
      );

      await interaction.reply({
        content: `✅ Giveaway started! It will end <t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
        ephemeral: true,
      });
    } catch (error) {
      const locale = interaction.guildId ? await getGuildLocale(interaction.guildId) : 'en-US';
      const errorMessage = logGiveawayError(
        error,
        undefined,
        interaction.user.id,
        'start giveaway',
        locale
      );

      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  },
};

export default command;
