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
      `SELECT
        u.id,
        uo.refresh_token,
        uo.token_expires_at
       FROM users u
       LEFT JOIN user_oauth uo ON u.id = uo.user_id
       WHERE u.discord_id = $1`,
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

    // User not authorized (no refresh token = not authorized)
    if (!user.refresh_token) {
      return {
        isAuthorized: false,
        isExpired: false,
        hasAllScopes: false,
        missingScopes: DEFAULT_SCOPES,
        userScopes: [],
      };
    }

    // Check if refresh token expired
    const expiresAt = user.token_expires_at ? new Date(user.token_expires_at) : undefined;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    // User has refresh token = authorized and has all scopes
    // (scopes được verify lúc OAuth, không cần lưu DB)
    return {
      isAuthorized: true,
      isExpired,
      hasAllScopes: true,
      missingScopes: [],
      expiresAt,
      userScopes: DEFAULT_SCOPES,
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
      `SELECT
        u.id,
        uo.refresh_token,
        uo.token_expires_at
       FROM users u
       LEFT JOIN user_oauth uo ON u.id = uo.user_id
       WHERE u.discord_id = $1`,
      [interaction.user.id]
    );

    // User not in database yet
    if (result.rows.length === 0) {
      await sendAuthorizationRequest(interaction);
      return false;
    }

    const user = result.rows[0];

    // User not authorized (no refresh token)
    if (!user.refresh_token) {
      await sendAuthorizationRequest(interaction);
      return false;
    }

    // Check if refresh token expired
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      logger.warn(`OAuth token expired for user ${interaction.user.tag}`);
      await sendAuthorizationRequest(interaction, true);
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
  // Insert/update base user info
  const userResult = await pool.query(
    `INSERT INTO users (discord_id, username, last_seen)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (discord_id)
     DO UPDATE SET
       username = EXCLUDED.username,
       last_seen = CURRENT_TIMESTAMP
     RETURNING id`,
    [discordId, username]
  );

  const userId = userResult.rows[0].id;

  // Insert/update user profile (extended info)
  await pool.query(
    `INSERT INTO user_profiles (user_id, discriminator, avatar)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET
       discriminator = EXCLUDED.discriminator,
       avatar = EXCLUDED.avatar`,
    [userId, discriminator, avatar]
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

  // Get user ID
  const userResult = await pool.query(
    'SELECT id FROM users WHERE discord_id = $1',
    [discordId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`User not found: ${discordId}`);
  }

  const userId = userResult.rows[0].id;

  // Store ONLY refresh token (access token không cần lưu)
  await pool.query(
    `INSERT INTO user_oauth (
       user_id,
       refresh_token,
       token_expires_at
     )
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, refreshToken, expiresAt]
  );

  // Store email in user_profiles if provided
  if (email) {
    await pool.query(
      `INSERT INTO user_profiles (user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET email = EXCLUDED.email`,
      [userId, email]
    );
  }
}
