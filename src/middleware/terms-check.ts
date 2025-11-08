/**
 * Verification Middleware
 * Checks user verification level before executing commands
 */

import { ChatInputCommandInteraction, Message, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { userRepository, AccountStatus } from '../database/repositories/user.repository';
import { banRepository } from '../database/repositories/ban.repository';
import { config } from '../config';
import { VerificationLevel } from '../types/command';
import Logger from '../utils/logger';

/**
 * Check user verification for slash commands
 * @returns true if user can execute command, false if blocked
 */
export async function checkVerificationForSlashCommand(
  interaction: ChatInputCommandInteraction,
  verificationLevel: VerificationLevel = 'basic'
): Promise<boolean> {
  const userId = interaction.user.id;

  try {
    // Check if user exists in database
    let user = await userRepository.getUserByDiscordId(userId);

    // Auto-create user if not exists
    if (!user) {
      Logger.debug(`Auto-creating user record for ${interaction.user.tag} (${userId})`);
      user = await userRepository.createUser({
        discord_id: userId,
      });
    }

    // Check if user is banned
    const isBanned = await banRepository.isUserBanned(userId);
    if (isBanned) {
      const activeBan = await banRepository.getActiveBan(userId);

      const banMessage = activeBan?.expires_at
        ? `Tài khoản của bạn bị cấm đến <t:${Math.floor(activeBan.expires_at.getTime() / 1000)}:F>`
        : 'Tài khoản của bạn đã bị cấm vĩnh viễn';

      const reason = activeBan?.reason ? `\n**Lý do:** ${activeBan.reason}` : '';

      await interaction.reply({
        content: `🚫 **Tài khoản bị cấm khỏi bot**\n\n${banMessage}${reason}\n\nVui lòng liên hệ admin để biết thêm chi tiết.`,
        ephemeral: true,
      });
      Logger.debug(`User ${interaction.user.tag} blocked: Banned from bot`);
      return false;
    }

    // Generate links
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const termsLink = `${apiUrl}/api/auth/terms?user_id=${userId}`;
    const oauthLink = `${apiUrl}/api/auth/discord?user_id=${userId}`;

    // Check verification level requirements
    if (verificationLevel === 'basic') {
      // Basic: Only need agreed_terms = 1
      if (user.agreed_terms === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ Yêu cầu đồng ý điều khoản')
          .setDescription(
            'Bạn cần đồng ý với điều khoản sử dụng trước khi có thể sử dụng lệnh này.\n\n' +
            '**Click vào nút bên dưới để đồng ý:**'
          )
          .setFooter({ text: 'Lệnh này chỉ cần đồng ý điều khoản, không cần xác thực email' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('✅ Đồng ý điều khoản')
          .setStyle(ButtonStyle.Link)
          .setURL(termsLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });

        Logger.debug(`User ${interaction.user.tag} blocked: Need to agree to terms`);
        return false;
      }

      // Basic verification passed
      Logger.debug(`User ${interaction.user.tag} allowed: Basic verification passed`);
      return true;

    } else if (verificationLevel === 'verified') {
      // Verified: Need agreed_terms = 1 AND email IS NOT NULL
      if (user.agreed_terms === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực đầy đủ')
          .setDescription(
            'Lệnh này yêu cầu xác thực email qua Discord OAuth.\n\n' +
            '**Khi xác thực, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cấp quyền truy cập email của bạn\n' +
            '• Kích hoạt tài khoản để sử dụng tính năng nâng cao\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
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

        Logger.debug(`User ${interaction.user.tag} blocked: Need full verification (terms + email)`);
        return false;
      }

      if (!user.email) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực email')
          .setDescription(
            'Lệnh này yêu cầu bạn xác thực email qua Discord OAuth.\n\n' +
            'Bạn đã đồng ý điều khoản, nhưng chưa xác thực email.\n\n' +
            '**Click vào nút bên dưới để xác thực:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Xác thực email với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(oauthLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });

        Logger.debug(`User ${interaction.user.tag} blocked: Need email verification`);
        return false;
      }

      // Full verification passed
      Logger.debug(`User ${interaction.user.tag} allowed: Full verification passed`);
      return true;
    }

    // Should never reach here
    return false;

  } catch (error) {
    Logger.error(`Error checking verification for ${interaction.user.tag}`, error);

    // On error, block execution to be safe
    await interaction.reply({
      content: '❌ Đã xảy ra lỗi khi kiểm tra xác thực. Vui lòng thử lại sau.',
      ephemeral: true,
    });
    return false;
  }
}

/**
 * Check user verification for prefix commands
 * @returns true if user can execute command, false if blocked
 */
export async function checkVerificationForPrefixCommand(
  message: Message,
  verificationLevel: VerificationLevel = 'basic'
): Promise<boolean> {
  const userId = message.author.id;

  try {
    // Check if user exists in database
    let user = await userRepository.getUserByDiscordId(userId);

    // Auto-create user if not exists
    if (!user) {
      Logger.debug(`Auto-creating user record for ${message.author.tag} (${userId})`);
      user = await userRepository.createUser({
        discord_id: userId,
      });
    }

    // Check if user is banned
    const isBanned = await banRepository.isUserBanned(userId);
    if (isBanned) {
      const activeBan = await banRepository.getActiveBan(userId);

      const banMessage = activeBan?.expires_at
        ? `Tài khoản của bạn bị cấm đến <t:${Math.floor(activeBan.expires_at.getTime() / 1000)}:F>`
        : 'Tài khoản của bạn đã bị cấm vĩnh viễn';

      const reason = activeBan?.reason ? `\n**Lý do:** ${activeBan.reason}` : '';

      await message.reply({
        content: `🚫 **Tài khoản bị cấm khỏi bot**\n\n${banMessage}${reason}\n\nVui lòng liên hệ admin để biết thêm chi tiết.`,
      });
      Logger.debug(`User ${message.author.tag} blocked: Banned from bot`);
      return false;
    }

    // Generate links
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const termsLink = `${apiUrl}/api/auth/terms?user_id=${userId}`;
    const oauthLink = `${apiUrl}/api/auth/discord?user_id=${userId}`;

    // Check verification level requirements
    if (verificationLevel === 'basic') {
      // Basic: Only need agreed_terms = 1
      if (user.agreed_terms === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ Yêu cầu đồng ý điều khoản')
          .setDescription(
            'Bạn cần đồng ý với điều khoản sử dụng trước khi có thể sử dụng lệnh này.\n\n' +
            '**Click vào nút bên dưới để đồng ý:**'
          )
          .setFooter({ text: 'Lệnh này chỉ cần đồng ý điều khoản, không cần xác thực email' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('✅ Đồng ý điều khoản')
          .setStyle(ButtonStyle.Link)
          .setURL(termsLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await message.reply({
          embeds: [embed],
          components: [row],
        });

        Logger.debug(`User ${message.author.tag} blocked: Need to agree to terms`);
        return false;
      }

      // Basic verification passed
      Logger.debug(`User ${message.author.tag} allowed: Basic verification passed`);
      return true;

    } else if (verificationLevel === 'verified') {
      // Verified: Need agreed_terms = 1 AND email IS NOT NULL
      if (user.agreed_terms === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực đầy đủ')
          .setDescription(
            'Lệnh này yêu cầu xác thực email qua Discord OAuth.\n\n' +
            '**Khi xác thực, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cấp quyền truy cập email của bạn\n' +
            '• Kích hoạt tài khoản để sử dụng tính năng nâng cao\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
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

        Logger.debug(`User ${message.author.tag} blocked: Need full verification (terms + email)`);
        return false;
      }

      if (!user.email) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực email')
          .setDescription(
            'Lệnh này yêu cầu bạn xác thực email qua Discord OAuth.\n\n' +
            'Bạn đã đồng ý điều khoản, nhưng chưa xác thực email.\n\n' +
            '**Click vào nút bên dưới để xác thực:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Xác thực email với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(oauthLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await message.reply({
          embeds: [embed],
          components: [row],
        });

        Logger.debug(`User ${message.author.tag} blocked: Need email verification`);
        return false;
      }

      // Full verification passed
      Logger.debug(`User ${message.author.tag} allowed: Full verification passed`);
      return true;
    }

    // Should never reach here
    return false;

  } catch (error) {
    Logger.error(`Error checking verification for ${message.author.tag}`, error);

    // On error, block execution to be safe
    await message.reply({
      content: '❌ Đã xảy ra lỗi khi kiểm tra xác thực. Vui lòng thử lại sau.',
    });
    return false;
  }
}

// Backwards compatibility exports
export const checkTermsForSlashCommand = checkVerificationForSlashCommand;
export const checkTermsForPrefixCommand = checkVerificationForPrefixCommand;
