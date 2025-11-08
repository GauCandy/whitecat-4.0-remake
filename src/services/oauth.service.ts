/**
 * OAuth Service
 * Handles Discord OAuth2 flow for user authentication
 */

import { config } from '../config';
import { userRepository, AccountStatus } from '../database/repositories/user.repository';
import Logger from '../utils/logger';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
  verified: boolean;
}

export class OAuthService {
  private readonly DISCORD_API = 'https://discord.com/api/v10';
  private readonly OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
  private readonly TOKEN_URL = 'https://discord.com/api/oauth2/token';

  /**
   * Generate OAuth URL for user to authorize
   * @param discordUserId - Discord user ID to encode in state
   * @param scope - 'basic' for identify only, 'verified' for identify + email
   * @returns OAuth authorization URL
   */
  generateAuthUrl(discordUserId: string, scope: 'basic' | 'verified' = 'verified'): string {
    // Determine OAuth scopes based on verification level
    const oauthScope = scope === 'basic' ? 'identify' : 'identify email';

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: oauthScope,
      state: `${discordUserId}:${scope}`, // Pass Discord user ID and scope in state
    });

    return `${this.OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @returns Token response from Discord
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return (await response.json()) as DiscordTokenResponse;
  }

  /**
   * Get user information from Discord API
   * @param accessToken - OAuth access token
   * @returns Discord user object
   */
  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    const response = await fetch(`${this.DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    return (await response.json()) as DiscordUser;
  }

  /**
   * Complete OAuth flow and save user data to database
   * @param code - Authorization code
   * @param state - State parameter containing Discord user ID and scope
   * @returns Created/updated user and scope information
   */
  async completeOAuth(code: string, state: string): Promise<{ user: any; scope: 'basic' | 'verified' }> {
    try {
      // Parse state parameter: "discordUserId:scope"
      const [discordUserId, scope] = state.split(':') as [string, 'basic' | 'verified'];

      if (!discordUserId || !scope) {
        throw new Error('Invalid state parameter');
      }

      // Step 1: Exchange code for tokens
      Logger.debug(`Exchanging code for tokens for user ${discordUserId} (scope: ${scope})`);
      const tokenResponse = await this.exchangeCode(code);

      // Step 2: Get user info
      Logger.debug(`Fetching user info for user ${discordUserId}`);
      const discordUser = await this.getUserInfo(tokenResponse.access_token);

      // Verify the Discord user ID matches
      if (discordUser.id !== discordUserId) {
        throw new Error('Discord user ID mismatch');
      }

      // Step 3: Get or create user
      const user = await userRepository.getOrCreateUser({
        discord_id: discordUserId,
      });

      // Step 4: Update user based on scope
      Logger.debug(`Updating user ${discordUserId} with OAuth data (scope: ${scope})`);

      if (scope === 'verified') {
        // Full verification: save email and agree to terms
        const updatedUser = await userRepository.updateUser({
          discord_id: discordUserId,
          email: discordUser.email,
          agreed_terms: 1,
        });
        Logger.success(`OAuth completed for user ${discordUser.username}#${discordUser.discriminator} (verified with email)`);
        return { user: updatedUser, scope: 'verified' };
      } else {
        // Basic authorization: only agree to terms, no email
        const updatedUser = await userRepository.updateUser({
          discord_id: discordUserId,
          agreed_terms: 1,
        });
        Logger.success(`OAuth completed for user ${discordUser.username}#${discordUser.discriminator} (basic authorization)`);
        return { user: updatedUser, scope: 'basic' };
      }
    } catch (error) {
      Logger.error(`OAuth error`, error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token
   * @returns New token response
   */
  async refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return (await response.json()) as DiscordTokenResponse;
  }
}

// Export singleton
export const oauthService = new OAuthService();
