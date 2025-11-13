import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { pool } from '../database/config';
import { generateAuthUrl, generateState } from '../utils/oauth';
import { logger } from '../utils/logger';

/**
 * Check if user is authorized to use commands
 * @param interaction - Command interaction
 * @param requiredScopes - Additional scopes required beyond default
 * @returns True if authorized, false otherwise
 */
export async function checkAuthorization(
  interaction: ChatInputCommandInteraction,
  requiredScopes: string[] = []
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT is_authorized, oauth_token_expires_at, oauth_scopes FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    // User not in database yet
    if (result.rows.length === 0) {
      await sendAuthorizationRequest(interaction, requiredScopes);
      return false;
    }

    const user = result.rows[0];

    // User not authorized yet
    if (!user.is_authorized) {
      await sendAuthorizationRequest(interaction, requiredScopes);
      return false;
    }

    // Check if token expired
    if (user.oauth_token_expires_at && new Date(user.oauth_token_expires_at) < new Date()) {
      logger.warn(`OAuth token expired for user ${interaction.user.tag}`);
      await sendAuthorizationRequest(interaction, requiredScopes, true);
      return false;
    }

    // Check if user has all required scopes
    if (requiredScopes.length > 0) {
      const userScopes = user.oauth_scopes ? user.oauth_scopes.split(' ') : [];
      const missingScopes = requiredScopes.filter(scope => !userScopes.includes(scope));

      if (missingScopes.length > 0) {
        logger.warn(`User ${interaction.user.tag} missing scopes: ${missingScopes.join(', ')}`);
        await sendAuthorizationRequest(interaction, requiredScopes, false, missingScopes);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking authorization:', error);
    await interaction.reply({
      content: '❌ An error occurred while checking your authorization status.',
      ephemeral: true,
    });
    return false;
  }
}

/**
 * Send authorization request to user
 * @param interaction - Command interaction
 * @param additionalScopes - Additional scopes required
 * @param isExpired - Whether token is expired
 * @param missingScopes - Scopes user is missing
 */
async function sendAuthorizationRequest(
  interaction: ChatInputCommandInteraction,
  additionalScopes: string[] = [],
  isExpired = false,
  missingScopes: string[] = []
): Promise<void> {
  const state = generateState();
  const authUrl = generateAuthUrl(state, additionalScopes);

  // Scope descriptions
  const scopeDescriptions: Record<string, string> = {
    identify: 'Access your basic Discord info',
    'applications.commands': 'Manage your application commands',
    email: 'Access your email address',
    guilds: 'View your Discord servers',
    connections: 'View your connected accounts',
    'guilds.join': 'Join servers on your behalf',
  };

  // Build required permissions list
  const allScopes = ['identify', 'applications.commands', ...additionalScopes];
  const permissionsList = allScopes
    .map(scope => `• **${scope}** - ${scopeDescriptions[scope] || 'Additional permission'}`)
    .join('\n');

  // Determine title and description
  let title = '🔐 Authorization Required';
  let description = 'Before using this bot, you need to authorize it to access your Discord account.';

  if (missingScopes.length > 0) {
    title = '⚠️ Additional Authorization Required';
    description = `This command requires additional permissions that you haven't granted yet:\n\n${missingScopes.map(s => `• **${s}**`).join('\n')}\n\nPlease re-authorize to continue.`;
  } else if (isExpired) {
    title = '🔄 Authorization Expired';
    description = 'Your authorization has expired. Please authorize again to continue using commands.';
  }

  const embed = new EmbedBuilder()
    .setColor(missingScopes.length > 0 ? 0xffa500 : isExpired ? 0xffa500 : 0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      {
        name: '📋 Required Permissions',
        value: permissionsList,
        inline: false,
      },
      {
        name: '🔒 Privacy & Security',
        value: 'Your data is stored securely and only used for bot functionality. We will never share your information with third parties.',
        inline: false,
      },
      {
        name: '📝 Terms of Service',
        value: 'By authorizing, you agree to our Terms of Service and Privacy Policy.',
        inline: false,
      }
    )
    .setFooter({
      text: 'WhiteCat Hosting Bot',
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
}

/**
 * Register or update user in database
 * @param discordId - Discord user ID
 * @param username - Discord username
 * @param discriminator - Discord discriminator
 * @param avatar - Discord avatar hash
 */
export async function registerUser(
  discordId: string,
  username: string,
  discriminator: string,
  avatar: string | null
): Promise<void> {
  await pool.query(
    `INSERT INTO users (discord_id, username, discriminator, avatar, last_seen)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (discord_id)
     DO UPDATE SET
       username = EXCLUDED.username,
       discriminator = EXCLUDED.discriminator,
       avatar = EXCLUDED.avatar,
       last_seen = CURRENT_TIMESTAMP`,
    [discordId, username, discriminator, avatar]
  );
}

/**
 * Store OAuth2 tokens in database
 * @param discordId - Discord user ID
 * @param accessToken - OAuth2 access token
 * @param refreshToken - OAuth2 refresh token
 * @param expiresIn - Token expiry time in seconds
 * @param scopes - Granted scopes
 * @param email - User email (if email scope granted)
 */
export async function storeOAuthTokens(
  discordId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scopes: string,
  email?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await pool.query(
    `UPDATE users
     SET
       is_authorized = true,
       oauth_access_token = $2,
       oauth_refresh_token = $3,
       oauth_token_expires_at = $4,
       oauth_scopes = $5,
       email = $6,
       terms_accepted_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     WHERE discord_id = $1`,
    [discordId, accessToken, refreshToken, expiresAt, scopes, email || null]
  );
}
