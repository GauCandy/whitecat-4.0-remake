import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { pool } from '../database/config';
import { generateUserInstallUrl, generateState, USER_INSTALL_SCOPES } from '../utils/oauth';
import { logger } from '../utils/logger';

/**
 * Authorization status result
 */
export interface AuthorizationStatus {
  isAuthorized: boolean;
  isExpired: boolean;
  hasAllScopes: boolean;
  missingScopes: string[];
  expiresAt?: Date;
  userScopes: string[];
}

/**
 * Get user authorization status
 * Checks for default scopes: identify + applications.commands + email
 * @param discordId - Discord user ID
 * @returns Authorization status
 */
export async function getUserAuthorizationStatus(
  discordId: string
): Promise<AuthorizationStatus> {
  // Default scopes (always required for all commands)
  const DEFAULT_SCOPES = USER_INSTALL_SCOPES;

  try {
    const result = await pool.query(
      'SELECT is_authorized, oauth_token_expires_at, oauth_scopes FROM users WHERE discord_id = $1',
      [discordId]
    );

    // User not in database
    if (result.rows.length === 0) {
      return {
        isAuthorized: false,
        isExpired: false,
        hasAllScopes: false,
        missingScopes: DEFAULT_SCOPES,
        userScopes: [],
      };
    }

    const user = result.rows[0];

    // User not authorized
    if (!user.is_authorized) {
      return {
        isAuthorized: false,
        isExpired: false,
        hasAllScopes: false,
        missingScopes: DEFAULT_SCOPES,
        userScopes: [],
      };
    }

    // Check if token expired
    const expiresAt = user.oauth_token_expires_at ? new Date(user.oauth_token_expires_at) : undefined;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    // Get user scopes
    const userScopes = user.oauth_scopes ? user.oauth_scopes.split(' ') : [];

    // Check if user has ALL default scopes
    const missingScopes = DEFAULT_SCOPES.filter(scope => !userScopes.includes(scope));
    const hasAllScopes = missingScopes.length === 0;

    return {
      isAuthorized: true,
      isExpired,
      hasAllScopes,
      missingScopes,
      expiresAt,
      userScopes,
    };
  } catch (error) {
    logger.error('Error getting user authorization status:', error);
    return {
      isAuthorized: false,
      isExpired: false,
      hasAllScopes: false,
      missingScopes: DEFAULT_SCOPES,
      userScopes: [],
    };
  }
}

/**
 * Check if user is authorized to use commands
 * Requires default scopes: identify + applications.commands + email
 * @param interaction - Command interaction
 * @returns True if authorized, false otherwise
 */
export async function checkAuthorization(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT is_authorized, oauth_token_expires_at, oauth_scopes FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    // Default scopes required for all commands
    const DEFAULT_SCOPES = ['identify', 'applications.commands', 'email'];

    // User not in database yet
    if (result.rows.length === 0) {
      await sendAuthorizationRequest(interaction);
      return false;
    }

    const user = result.rows[0];

    // User not authorized yet
    if (!user.is_authorized) {
      await sendAuthorizationRequest(interaction);
      return false;
    }

    // Check if token expired
    if (user.oauth_token_expires_at && new Date(user.oauth_token_expires_at) < new Date()) {
      logger.warn(`OAuth token expired for user ${interaction.user.tag}`);
      await sendAuthorizationRequest(interaction, true);
      return false;
    }

    // Check if user has all default scopes
    const userScopes = user.oauth_scopes ? user.oauth_scopes.split(' ') : [];
    const missingScopes = DEFAULT_SCOPES.filter(scope => !userScopes.includes(scope));

    if (missingScopes.length > 0) {
      logger.warn(`User ${interaction.user.tag} missing scopes: ${missingScopes.join(', ')}`);
      await sendAuthorizationRequest(interaction, false, missingScopes);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking authorization:', error);
    await interaction.reply({
      content: '❌ An error occurred while checking your authorization status.',
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
}

/**
 * Send authorization request to user
 * @param interaction - Command interaction
 * @param isExpired - Whether token is expired
 * @param missingScopes - Scopes user is missing
 */
async function sendAuthorizationRequest(
  interaction: ChatInputCommandInteraction,
  isExpired = false,
  missingScopes: string[] = []
): Promise<void> {
  const state = generateState();
  const authUrl = generateUserInstallUrl(state);

  // Scope descriptions
  const scopeDescriptions: Record<string, string> = {
    identify: 'Access your basic Discord info',
    'applications.commands': 'Use bot slash commands (User Install)',
    email: 'Access your email address',
  };

  // Build required permissions list
  const allScopes = USER_INSTALL_SCOPES;
  const permissionsList = allScopes
    .map(scope => `• **${scope}** - ${scopeDescriptions[scope]}`)
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
    flags: MessageFlags.Ephemeral,
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
 * @param clientIP - Client IP address (for anti-clone detection)
 * @param userAgent - Client user agent (for anti-clone detection)
 */
export async function storeOAuthTokens(
  discordId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scopes: string,
  email?: string,
  clientIP?: string | null,
  userAgent?: string | null
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
