/**
 * Verification Middleware
 * Checks user verification level before executing commands
 */

import { ChatInputCommandInteraction, Message, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { userRepository, VerificationLevel as DBVerificationLevel } from '../database/repositories/user.repository';
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
        flags: MessageFlags.Ephemeral,
      });
      Logger.debug(`User ${interaction.user.tag} blocked: Banned from bot`);
      return false;
    }

    // Generate OAuth links with appropriate scope
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const basicOAuthLink = `${apiUrl}/api/auth/discord?user_id=${userId}&scope=basic`;
    const verifiedOAuthLink = `${apiUrl}/api/auth/discord?user_id=${userId}&scope=verified`;

    // Check verification level requirements
    if (verificationLevel === 'basic') {
      // Basic: Need OAuth authorization (verification_level >= BASIC)
      if (user.verification_level < DBVerificationLevel.BASIC) {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🔐 Yêu cầu ủy quyền Discord')
          .setDescription(
            'Bạn cần ủy quyền cho bot để sử dụng lệnh này.\n\n' +
            '**Khi ủy quyền, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cho phép bot truy cập thông tin cơ bản của bạn\n' +
            '• Kích hoạt các tính năng như DM, hosting, v.v.\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Bot chỉ truy cập thông tin Discord cơ bản, không yêu cầu email' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Ủy quyền với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(basicOAuthLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        Logger.debug(`User ${interaction.user.tag} blocked: Need basic OAuth authorization`);
        return false;
      }

      // Basic verification passed
      Logger.debug(`User ${interaction.user.tag} allowed: Basic verification passed`);
      return true;

    } else if (verificationLevel === 'verified') {
      // Verified: Need OAuth with email (verification_level === VERIFIED)
      if (user.verification_level < DBVerificationLevel.VERIFIED) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực Email')
          .setDescription(
            'Lệnh này yêu cầu xác thực email qua Discord OAuth.\n\n' +
            '**Khi xác thực, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cấp quyền truy cập email của bạn\n' +
            '• Kích hoạt tài khoản cho tính năng premium\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Xác thực Email với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(verifiedOAuthLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
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

    // Generate OAuth links with appropriate scope
    const apiUrl = config.redirectUri.replace('/api/auth/discord/callback', '');
    const basicOAuthLink = `${apiUrl}/api/auth/discord?user_id=${userId}&scope=basic`;
    const verifiedOAuthLink = `${apiUrl}/api/auth/discord?user_id=${userId}&scope=verified`;

    // Check verification level requirements
    if (verificationLevel === 'basic') {
      // Basic: Need OAuth authorization (verification_level >= BASIC)
      if (user.verification_level < DBVerificationLevel.BASIC) {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🔐 Yêu cầu ủy quyền Discord')
          .setDescription(
            'Bạn cần ủy quyền cho bot để sử dụng lệnh này.\n\n' +
            '**Khi ủy quyền, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cho phép bot truy cập thông tin cơ bản của bạn\n' +
            '• Kích hoạt các tính năng như DM, hosting, v.v.\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Bot chỉ truy cập thông tin Discord cơ bản, không yêu cầu email' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Ủy quyền với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(basicOAuthLink);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await message.reply({
          embeds: [embed],
          components: [row],
        });

        Logger.debug(`User ${message.author.tag} blocked: Need basic OAuth authorization`);
        return false;
      }

      // Basic verification passed
      Logger.debug(`User ${message.author.tag} allowed: Basic verification passed`);
      return true;

    } else if (verificationLevel === 'verified') {
      // Verified: Need OAuth with email (verification_level === VERIFIED)
      if (user.verification_level < DBVerificationLevel.VERIFIED) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Yêu cầu xác thực Email')
          .setDescription(
            'Lệnh này yêu cầu xác thực email qua Discord OAuth.\n\n' +
            '**Khi xác thực, bạn sẽ:**\n' +
            '• Đồng ý với điều khoản sử dụng bot\n' +
            '• Cấp quyền truy cập email của bạn\n' +
            '• Kích hoạt tài khoản cho tính năng premium\n\n' +
            '**Click vào nút bên dưới để bắt đầu:**'
          )
          .setFooter({ text: 'Email của bạn sẽ được sử dụng cho tính năng hosting và premium' })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('🔐 Xác thực Email với Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(verifiedOAuthLink);

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
