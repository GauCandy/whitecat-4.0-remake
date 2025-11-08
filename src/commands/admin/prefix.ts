/**
 * Prefix Command
 * Allows server admins to set a custom command prefix for their server
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';
import { guildRepository } from '../../database/repositories/guild.repository';
import { t } from '../../services/locale.service';
import Logger from '../../utils/logger';

const prefixCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Set a custom command prefix for this server')
    .setDescriptionLocalizations({
      vi: 'Đặt prefix lệnh tùy chỉnh cho máy chủ này',
    })
    .addStringOption(option =>
      option
        .setName('prefix')
        .setDescription('Prefix to set (e.g., !, ?, w!)')
        .setDescriptionLocalizations({
          vi: 'Prefix muốn đặt (ví dụ: !, ?, w!)',
        })
        .setRequired(true)
        .setMaxLength(5) // Limit prefix length
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Only admins can use
    .setDMPermission(false), // Cannot be used in DMs

  verificationLevel: 'basic', // Require basic OAuth

  async execute(interaction: ChatInputCommandInteraction) {
    // Double-check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ Bạn cần quyền **Manage Server** để sử dụng lệnh này!',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Lệnh này chỉ có thể sử dụng trong server!',
        ephemeral: true,
      });
      return;
    }

    const newPrefix = interaction.options.getString('prefix', true).trim();

    // Validate prefix
    if (newPrefix.length === 0) {
      await interaction.reply({
        content: '❌ Prefix không được để trống!',
        ephemeral: true,
      });
      return;
    }

    if (newPrefix.length > 5) {
      await interaction.reply({
        content: '❌ Prefix không được dài quá 5 ký tự!',
        ephemeral: true,
      });
      return;
    }

    // Check for invalid characters (optional)
    if (newPrefix.includes(' ')) {
      await interaction.reply({
        content: '❌ Prefix không được chứa khoảng trắng!',
        ephemeral: true,
      });
      return;
    }

    try {
      // Get current guild settings
      const oldGuild = await guildRepository.getOrCreateGuild(interaction.guildId);
      const oldPrefix = oldGuild.prefix;

      // Update guild prefix in database
      const guild = await guildRepository.setPrefix(interaction.guildId, newPrefix);

      const languageNames = {
        vi: '🇻🇳 Tiếng Việt',
        en: '🇺🇸 English',
      };

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Đã đặt prefix thành công!')
        .setDescription(
          `**Prefix cũ:** \`${oldPrefix}\`\n` +
          `**Prefix mới:** \`${newPrefix}\`\n\n` +
          `Bây giờ bạn có thể sử dụng prefix commands với \`${newPrefix}\`\n` +
          `Ví dụ: \`${newPrefix}help\`, \`${newPrefix}ping\``
        )
        .setFooter({ text: `Ngôn ngữ hiện tại: ${languageNames[guild.locale]}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      Logger.info(`Prefix changed from "${oldPrefix}" to "${newPrefix}" for guild ${interaction.guild?.name} by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error setting prefix', error);

      await interaction.reply({
        content: '❌ Đã xảy ra lỗi khi đặt prefix. Vui lòng thử lại sau.',
        ephemeral: true,
      });
    }
  },
};

export default prefixCommand;
