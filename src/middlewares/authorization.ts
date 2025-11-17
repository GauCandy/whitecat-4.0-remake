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
 * Checks if user accepted terms via OAuth
 * @param discordId - Discord user ID
 * @returns Authorization status
 */
export async function getUserAuthorizationStatus(
  discordId: string
): Promise<AuthorizationStatus> {
  try {
    const result = await pool.query(
      'SELECT terms_accepted FROM users WHERE discord_id = $1',
      [discordId]
    );

    // User accepted terms = authorized
    const isAuthorized = result.rows.length > 0 && result.rows[0].terms_accepted === true;

    return {
      isAuthorized,
      isExpired: false,
      hasAllScopes: true,
      missingScopes: [],
      userScopes: [],
    };
  } catch (error) {
    logger.error('Error getting user authorization status:', error);
    return {
      isAuthorized: false,
      isExpired: false,
      hasAllScopes: false,
      missingScopes: [],
      userScopes: [],
    };
  }
}

/**
 * Check if user is authorized to use commands
 * Requires user to accept terms via OAuth
 * @param interaction - Command interaction
 * @returns True if authorized, false otherwise
 */
export async function checkAuthorization(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT terms_accepted FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    // User not in database OR terms not accepted
    if (result.rows.length === 0 || !result.rows[0].terms_accepted) {
      await sendAuthorizationRequest(interaction);
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
 * @param acceptedTerms - User accepted terms (default false, true if from OAuth)
 */
export async function registerUser(
  discordId: string,
  acceptedTerms: boolean = false
): Promise<void> {
  await pool.query(
    `INSERT INTO users (discord_id, terms_accepted, last_seen)
     VALUES ($1, $2, NOW())
     ON CONFLICT (discord_id)
     DO UPDATE SET
       terms_accepted = CASE
         WHEN EXCLUDED.terms_accepted = true THEN true
         ELSE users.terms_accepted
       END,
       last_seen = NOW()`,
    [discordId, acceptedTerms]
  );
}

/**
 * Store OAuth2 tokens - DEPRECATED
 * OAuth is now handled separately via web interface
 * This function is kept for backwards compatibility but does nothing
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
  // OAuth tokens are no longer stored in bot database
  // Web interface handles OAuth separately
  return;
}
