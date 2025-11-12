import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';
import { generateAuthUrl, generateState } from '../../utils/oauth';
import { registerUser } from '../../middlewares/authorization';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Authorize the bot to access your Discord account'),

  category: CommandCategory.Utility,
  cooldown: 5,
  requiresAuth: false, // This command is for authorization itself

  async execute(interaction) {
    // Register user if not exists
    await registerUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.avatar
    );

    // Check if already authorized
    const result = await pool.query(
      'SELECT is_authorized, oauth_token_expires_at FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    if (result.rows.length > 0 && result.rows[0].is_authorized) {
      const expiresAt = result.rows[0].oauth_token_expires_at;
      const isExpired = expiresAt && new Date(expiresAt) < new Date();

      if (!isExpired) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Already Authorized')
          .setDescription('You are already authorized to use this bot!')
          .addFields({
            name: '🔑 Token Expires',
            value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`,
            inline: false,
          })
          .setFooter({
            text: 'WhiteCat Hosting Bot',
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
        return;
      }
    }

    // Generate authorization URL
    const state = generateState();
    const authUrl = generateAuthUrl(state);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🔐 Authorization Required')
      .setDescription(
        'To use this bot, you need to authorize it to access your Discord account.\n\n' +
          'Click the button below to authorize.'
      )
      .addFields(
        {
          name: '📋 Required Permissions',
          value:
            '• **identify** - Access your basic Discord info (username, avatar, etc.)\n' +
            '• **applications.commands** - Allow bot to create and manage application commands for you',
          inline: false,
        },
        {
          name: '🔒 Privacy & Security',
          value:
            'Your data is stored securely and encrypted. We only collect necessary information to provide bot functionality.\n\n' +
            '• We will never share your information with third parties\n' +
            '• You can revoke access at any time\n' +
            '• We comply with Discord ToS and privacy regulations',
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
      ephemeral: true,
    });
  },
};

export default command;
