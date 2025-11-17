import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { generateUserInstallUrl, generateState } from '../../utils/oauth';
import { registerUser, getUserAuthorizationStatus } from '../../middlewares/authorization';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Authorize the bot to access your Discord account'),

  category: CommandCategory.Utility,
  cooldown: 5,
  requiresAuth: false, // Must be false - this command is used to authorize, so it can't require authorization

  async execute(interaction) {
    // Register user if not exists (terms_accepted defaults to false)
    await registerUser(interaction.user.id);

    // Check if user already has full authorization
    // Note: We use getUserAuthorizationStatus service instead of direct database query
    const authStatus = await getUserAuthorizationStatus(interaction.user.id);

    // User already authorized (terms_accepted = true)
    if (authStatus.isAuthorized && !authStatus.isExpired && authStatus.hasAllScopes) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Already Authorized')
        .setDescription('You are already authorized to use this bot with all required permissions!')
        .addFields({
          name: '🔑 Token Expires',
          value: authStatus.expiresAt
            ? `<t:${Math.floor(authStatus.expiresAt.getTime() / 1000)}:R>`
            : 'Unknown',
          inline: false,
        })
        .setFooter({
          text: 'WhiteCat Bot',
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // User needs to authorize or re-authorize (token expired or missing scopes)
    const state = generateState();
    const authUrl = generateUserInstallUrl(state); // Use user-installable app (integration_type=1)

    // Determine authorization status message
    let title = '🔐 Authorization Required';
    let description = 'To use this bot, you need to authorize it to access your Discord account.\n\nClick the button below to authorize.';

    if (authStatus.isAuthorized && authStatus.isExpired) {
      title = '🔄 Authorization Expired';
      description = 'Your authorization has expired. Please authorize again to continue using the bot.';
    } else if (authStatus.isAuthorized && !authStatus.hasAllScopes) {
      title = '⚠️ Additional Authorization Required';
      description = `You need to grant additional permissions to use all features.\n\nMissing: **${authStatus.missingScopes.join(', ')}**\n\nPlease re-authorize to continue.`;
    }

    const embed = new EmbedBuilder()
      .setColor(authStatus.isExpired || !authStatus.hasAllScopes ? 0xffa500 : 0x5865f2)
      .setTitle(title)
      .setDescription(description)
      .addFields(
        {
          name: '📋 Required Permissions',
          value:
            '• **identify** - Access your basic Discord info (username, avatar, etc.)\n' +
            '• **applications.commands** - Allow you to use bot slash commands (User Install)',
          inline: false,
        },
        {
          name: '🔒 Privacy & Security',
          value:
            'Your data is stored securely. We only collect necessary information to provide bot functionality.\n\n' +
            '• ✅ We will NEVER sell or share your data\n' +
            '• ✅ Only basic Discord info is collected\n' +
            '• ✅ You can revoke access at any time in Discord settings\n' +
            '• ✅ We comply with Discord ToS and privacy regulations',
          inline: false,
        },
        {
          name: '📝 What happens after authorization?',
          value:
            '1. You will be redirected to Discord OAuth2 page\n' +
            '2. Review and accept the requested permissions\n' +
            '3. You will be redirected back to our website\n' +
            '4. Your account will be linked and you can start using commands',
          inline: false,
        }
      )
      .setFooter({
        text: 'By authorizing, you agree to our Terms of Service',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [
        {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 5, // Link
              label: '🔗 Authorize Now',
              url: authUrl,
            },
          ],
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
