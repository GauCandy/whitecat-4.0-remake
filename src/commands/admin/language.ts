/**
 * Language Command
 * Allows server admins to set the bot's language for their server
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';
import { guildRepository } from '../../database/repositories/guild.repository';
import { SupportedLocale } from '../../types/locale';
import { t } from '../../services/locale.service';
import Logger from '../../utils/logger';

const languageCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Set the bot language for this server')
    .setDescriptionLocalizations({
      vi: 'Đặt ngôn ngữ của bot cho máy chủ này',
    })
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription('Language to set')
        .setDescriptionLocalizations({
          vi: 'Ngôn ngữ muốn đặt',
        })
        .setRequired(true)
        .addChoices(
          { name: '🇻🇳 Tiếng Việt (Vietnamese)', value: 'vi' },
          { name: '🇺🇸 English', value: 'en' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Only admins can use
    .setDMPermission(false), // Cannot be used in DMs

  verificationLevel: 'basic', // Require basic OAuth

  async execute(interaction: ChatInputCommandInteraction) {
    // Double-check permissions (shouldn't be needed but good practice)
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

    const locale = interaction.options.getString('language', true) as SupportedLocale;

    try {
      // Update guild locale in database
      const guild = await guildRepository.setLocale(interaction.guildId, locale);

      const languageNames: Record<SupportedLocale, string> = {
        vi: '🇻🇳 Tiếng Việt',
        en: '🇺🇸 English',
      };

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Đã đặt ngôn ngữ thành công!')
        .setDescription(
          `Ngôn ngữ của bot trong server này đã được đặt thành **${languageNames[locale]}**\n\n` +
          `**Lưu ý:** Các lệnh slash sẽ vẫn hiển thị bằng ngôn ngữ Discord của bạn, nhưng nội dung phản hồi sẽ sử dụng ngôn ngữ đã đặt.`
        )
        .setFooter({ text: `Prefix hiện tại: ${guild.prefix}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      Logger.info(`Language set to ${locale} for guild ${interaction.guild?.name} by ${interaction.user.tag}`);
    } catch (error) {
      Logger.error('Error setting language', error);

      await interaction.reply({
        content: '❌ Đã xảy ra lỗi khi đặt ngôn ngữ. Vui lòng thử lại sau.',
        ephemeral: true,
      });
    }
  },
};

export default languageCommand;
