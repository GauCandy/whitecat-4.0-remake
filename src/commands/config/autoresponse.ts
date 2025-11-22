import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';
import { botLogger } from '../../utils/logger';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('autoresponse')
    .setDescription('View and manage auto-response settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  category: CommandCategory.Config,
  cooldown: 5,
  requiresAuth: false, // Public command for admins

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // Lấy thông tin guild từ database
      const guildResult = await pool.query(
        'SELECT id FROM guilds WHERE guild_id = $1',
        [interaction.guild.id]
      );

      if (guildResult.rows.length === 0) {
        await interaction.reply({
          content: '❌ Server not found in database. Please try again later.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const dbGuildId = guildResult.rows[0].id;

      // Đếm số auto-responses
      const statsResult = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_enabled = true) as enabled,
          COUNT(*) FILTER (WHERE is_enabled = false) as disabled
         FROM auto_responses
         WHERE guild_id = $1`,
        [dbGuildId]
      );

      const stats = statsResult.rows[0];
      const totalResponses = parseInt(stats.total) || 0;
      const enabledResponses = parseInt(stats.enabled) || 0;
      const disabledResponses = parseInt(stats.disabled) || 0;

      // Lấy danh sách blocked channels
      const blockedResult = await pool.query(
        'SELECT COUNT(*) as count FROM auto_response_blocked_channels WHERE guild_id = $1',
        [dbGuildId]
      );

      const blockedChannels = parseInt(blockedResult.rows[0].count) || 0;

      // Tạo embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🤖 Auto-Response Settings')
        .setDescription(
          totalResponses > 0
            ? 'Auto-response system is set up and ready to use!'
            : 'No auto-responses configured yet. Click the button below to get started!'
        )
        .addFields(
          {
            name: '📊 Statistics',
            value: [
              `**Total:** ${totalResponses} response${totalResponses !== 1 ? 's' : ''}`,
              `**Active:** ${enabledResponses} ✅`,
              `**Disabled:** ${disabledResponses} ⏸️`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🚫 Blocked Channels',
            value: `${blockedChannels} channel${blockedChannels !== 1 ? 's' : ''}`,
            inline: true,
          },
          {
            name: '⚙️ Features',
            value: [
              '• Multiple match types',
              '• Case-sensitive options',
              '• Channel blocking',
              '• Enable/Disable toggle',
            ].join('\n'),
            inline: false,
          }
        )
        .setFooter({ text: `Server: ${interaction.guild.name}` })
        .setTimestamp();

      // Tạo button để mở web dashboard
      const webUrl = process.env.DASHBOARD_REDIRECT_URI?.replace('/dashboard/callback', '') || 'http://localhost:3000';
      const dashboardUrl = `${webUrl}/dashboard/guild/${interaction.guild.id}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Open Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(dashboardUrl)
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setLabel('Documentation')
          .setStyle(ButtonStyle.Link)
          .setURL('https://github.com/GauCandy/whitecat-4.0-remake#auto-response-system')
          .setEmoji('📖')
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      botLogger.error('Error executing autoresponse command:', error);

      await interaction.reply({
        content: '❌ Failed to fetch auto-response settings. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
