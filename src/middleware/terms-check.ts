/**
 * Terms Check Middleware
 * Checks if user has agreed to terms of service before executing commands
 */

import { ChatInputCommandInteraction, Message, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { userRepository, AccountStatus } from '../database/repositories/user.repository';
import { config } from '../config';
import Logger from '../utils/logger';

/**
 * Check if user has agreed to terms (for slash commands)
 * @returns true if user can execute command, false if blocked
 */
export async function checkTermsForSlashCommand(
  interaction: ChatInputCommandInteraction,
  requireTerms: boolean = true
): Promise<boolean> {
  // If command doesn't require terms, allow execution
  if (!requireTerms) {
    return true;
  }

  const userId = interaction.user.id;

  try {
    // Check if user exists in database
    const user = await userRepository.getUserByDiscordId(userId);

    // Generate OAuth link
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const oauthLink = `${apiUrl}/api/auth/discord?user_id=${userId}`;

    if (!user || user.account_status === AccountStatus.PENDING) {
      // User needs to complete OAuth to agree to terms
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Yêu cầu xác thực')
        .setDescription(
          'Bạn cần xác thực và đồng ý với điều khoản sử dụng trước khi có thể sử dụng lệnh này.\n\n' +
          '**Khi xác thực, bạn sẽ:**\n' +
          '• Đồng ý với điều khoản sử dụng bot\n' +
          '• Cấp quyền truy cập email của bạn\n' +
          '• Kích hoạt tài khoản để sử dụng đầy đủ tính năng\n\n' +
          '**Click vào nút bên dưới để bắt đầu:**'
        )
        .setFooter({ text: 'Email của bạn sẽ được sử dụng để phát triển tính năng hosting trong tương lai' })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel('🔐 Xác thực với Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(oauthLink);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });

      Logger.debug(`User ${interaction.user.tag} blocked: Need OAuth authentication`);
      return false;
    }

    if (user.account_status === AccountStatus.BANNED) {
      await interaction.reply({
        content: '🚫 **Tài khoản bị cấm**\n\n' +
          'Tài khoản của bạn đã bị cấm sử dụng bot.\n' +
          'Vui lòng liên hệ admin để biết thêm chi tiết.',
        ephemeral: true,
      });
      Logger.debug(`User ${interaction.user.tag} blocked: Banned`);
      return false;
    }

    // User is active, allow execution
    return true;

  } catch (error) {
    Logger.error(`Error checking terms for ${interaction.user.tag}`, error);

    // On error, block execution to be safe
    await interaction.reply({
      content: '❌ Đã xảy ra lỗi khi kiểm tra điều khoản. Vui lòng thử lại sau.',
      ephemeral: true,
    });
    return false;
  }
}

/**
 * Check if user has agreed to terms (for prefix commands)
 * @returns true if user can execute command, false if blocked
 */
export async function checkTermsForPrefixCommand(
  message: Message,
  requireTerms: boolean = true
): Promise<boolean> {
  // If command doesn't require terms, allow execution
  if (!requireTerms) {
    return true;
  }

  const userId = message.author.id;

  try {
    // Check if user exists in database
    const user = await userRepository.getUserByDiscordId(userId);

    // Generate OAuth link
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const oauthLink = `${apiUrl}/api/auth/discord?user_id=${userId}`;

    if (!user || user.account_status === AccountStatus.PENDING) {
      // User needs to complete OAuth to agree to terms
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Yêu cầu xác thực')
        .setDescription(
          'Bạn cần xác thực và đồng ý với điều khoản sử dụng trước khi có thể sử dụng lệnh này.\n\n' +
          '**Khi xác thực, bạn sẽ:**\n' +
          '• Đồng ý với điều khoản sử dụng bot\n' +
          '• Cấp quyền truy cập email của bạn\n' +
          '• Kích hoạt tài khoản để sử dụng đầy đủ tính năng\n\n' +
          '**Click vào nút bên dưới để bắt đầu:**'
        )
        .setFooter({ text: 'Email của bạn sẽ được sử dụng để phát triển tính năng hosting trong tương lai' })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel('🔐 Xác thực với Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(oauthLink);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await message.reply({
        embeds: [embed],
        components: [row],
      });

      Logger.debug(`User ${message.author.tag} blocked: Need OAuth authentication`);
      return false;
    }

    if (user.account_status === AccountStatus.BANNED) {
      await message.reply({
        content: '🚫 **Tài khoản bị cấm**\n\n' +
          'Tài khoản của bạn đã bị cấm sử dụng bot.\n' +
          'Vui lòng liên hệ admin để biết thêm chi tiết.',
      });
      Logger.debug(`User ${message.author.tag} blocked: Banned`);
      return false;
    }

    // User is active, allow execution
    return true;

  } catch (error) {
    Logger.error(`Error checking terms for ${message.author.tag}`, error);

    // On error, block execution to be safe
    await message.reply({
      content: '❌ Đã xảy ra lỗi khi kiểm tra điều khoản. Vui lòng thử lại sau.',
    });
    return false;
  }
}
