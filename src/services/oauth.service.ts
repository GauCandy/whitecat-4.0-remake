/**
 * OAuth Service
 * Handles Discord OAuth2 flow for user authentication
 */

import { config } from '../config';
import { userRepository, VerificationLevel } from '../database/repositories/user.repository';
import { userProfileRepository } from '../database/repositories/user-profile.repository';
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

export type OAuthFlowType = 'guild' | 'user' | 'basic' | 'verified';

/**
 * Unified OAuth Service
 * Handles all OAuth flows with consistent callback mechanism
 */
export class OAuthService {
  private readonly DISCORD_API = 'https://discord.com/api/v10';
  private readonly OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
  private readonly TOKEN_URL = 'https://discord.com/api/oauth2/token';

  /**
   * Generate OAuth URL based on flow type
   * @param flowType - Type of OAuth flow: 'guild', 'user', 'basic', 'verified'
   * @param userId - Optional Discord user ID (required for basic/verified flows)
   * @param permissions - Optional permissions for guild install (default: '0')
   * @returns OAuth authorization URL
   */
  generateOAuthUrl(flowType: OAuthFlowType, userId?: string, permissions: string = '0'): string {
    let scope: string;
    let integrationType: string | undefined;
    let includePermissions = false;
    let state: string;

    switch (flowType) {
      case 'guild':
        // Bot invitation to server
        scope = 'bot applications.commands identify';
        integrationType = '0';
        includePermissions = true;
        state = 'invite:guild'; // State format: invite:{flow_type}
        break;

      case 'user':
        // User Install Apps
        scope = 'applications.commands identify';
        integrationType = '1';
        state = 'invite:user'; // State format: invite:{flow_type}
        break;

      case 'basic':
        // Manual basic authorization
        if (!userId) {
          throw new Error('userId is required for basic auth flow');
        }
        scope = 'identify applications.commands';
        state = `auth:${userId}:basic`; // State format: auth:{user_id}:{scope}
        break;

      case 'verified':
        // Email verification
        if (!userId) {
          throw new Error('userId is required for verified auth flow');
        }
        scope = 'identify email applications.commands';
        state = `auth:${userId}:verified`; // State format: auth:{user_id}:{scope}
        break;

      default:
        throw new Error(`Unknown OAuth flow type: ${flowType}`);
    }

    const params: Record<string, string> = {
      client_id: config.clientId,
      response_type: 'code',
      scope,
      redirect_uri: config.redirectUri, // All flows now have redirect_uri
      state,
    };

    // Add integration type for bot install flows
    if (integrationType) {
      params.integration_type = integrationType;
    }

    // Add permissions for guild install
    if (includePermissions) {
      params.permissions = permissions;
    }

    const urlParams = new URLSearchParams(params);
    return `${this.OAUTH_URL}?${urlParams.toString()}`;
  }

  /**
   * Generate OAuth URL for user authorization (legacy method for backward compatibility)
   * @param discordUserId - Discord user ID
   * @param scope - 'basic' for identify only, 'verified' for identify + email
   * @returns OAuth authorization URL
   */
  generateAuthUrl(discordUserId: string, scope: 'basic' | 'verified' = 'verified'): string {
    return this.generateOAuthUrl(scope, discordUserId);
  }

  /**
   * Parse state parameter from OAuth callback
   * @param state - State string from OAuth callback
   * @returns Parsed state object
   */
  parseState(state: string): { type: 'invite' | 'auth'; flowType: OAuthFlowType; userId?: string; scope?: 'basic' | 'verified' } {
    const parts = state.split(':');

    if (parts[0] === 'invite') {
      // Invite flow: state = "invite:guild" or "invite:user"
      return {
        type: 'invite',
        flowType: parts[1] as OAuthFlowType,
      };
    } else if (parts[0] === 'auth') {
      // Auth flow: state = "auth:{user_id}:{scope}"
      return {
        type: 'auth',
        flowType: parts[2] as OAuthFlowType,
        userId: parts[1],
        scope: parts[2] as 'basic' | 'verified',
      };
    } else {
      // Legacy format: "{user_id}:{scope}"
      return {
        type: 'auth',
        flowType: parts[1] as OAuthFlowType,
        userId: parts[0],
        scope: parts[1] as 'basic' | 'verified',
      };
    }
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
   * Complete OAuth flow and save user data to database (Unified handler)
   * @param code - Authorization code from Discord
   * @param state - State parameter (format: "invite:{type}" or "auth:{user_id}:{scope}")
   * @returns Created/updated user and flow information
   */
  async completeOAuth(code: string, state: string): Promise<{
    user: any;
    flowType: OAuthFlowType;
    scope: 'basic' | 'verified';
    isInvite: boolean;
  }> {
    try {
      // Step 1: Parse state to determine flow type
      const parsedState = this.parseState(state);
      Logger.debug(`OAuth flow type: ${parsedState.type}, flowType: ${parsedState.flowType}`);

      // Step 2: Exchange code for tokens
      const tokenResponse = await this.exchangeCode(code);

      // Step 3: Get user info from Discord
      const discordUser = await this.getUserInfo(tokenResponse.access_token);
      const discordUserId = discordUser.id;

      Logger.debug(`Fetching user info: ${discordUser.username}#${discordUser.discriminator} (${discordUserId})`);

      // Step 4: Verify user ID matches (for auth flows only)
      if (parsedState.type === 'auth' && parsedState.userId !== discordUserId) {
        throw new Error('Discord user ID mismatch');
      }

      // Step 5: Get or create user
      const user = await userRepository.getOrCreateUser({
        discord_id: discordUserId,
      });

      // Step 6: Determine verification level based on flow
      let verificationLevel: VerificationLevel;
      let scope: 'basic' | 'verified';

      if (parsedState.flowType === 'verified') {
        // Verified flow: save email
        verificationLevel = VerificationLevel.VERIFIED;
        scope = 'verified';

        await userProfileRepository.upsertProfile({
          discord_id: discordUserId,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: discordUser.email,
        });

        Logger.success(`OAuth completed: ${discordUser.username}#${discordUser.discriminator} (VERIFIED with email)`);
      } else {
        // Basic flow (guild/user/basic): save basic profile only
        verificationLevel = VerificationLevel.BASIC;
        scope = 'basic';

        await userProfileRepository.upsertProfile({
          discord_id: discordUserId,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: null, // No email for basic
        });

        const flowName = parsedState.type === 'invite'
          ? `INVITE (${parsedState.flowType})`
          : 'AUTH (basic)';
        Logger.success(`OAuth completed: ${discordUser.username}#${discordUser.discriminator} (${flowName})`);
      }

      // Step 7: Update verification level
      const updatedUser = await userRepository.setVerificationLevel(
        discordUserId,
        verificationLevel
      );

      return {
        user: updatedUser,
        flowType: parsedState.flowType,
        scope,
        isInvite: parsedState.type === 'invite',
      };
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
