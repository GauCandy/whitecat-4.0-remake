import { config } from 'dotenv';
config();

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

// OAuth2 scopes for user authentication only
export const USER_AUTH_SCOPES = ['identify', 'email'];

// OAuth2 scopes for user-installable app (includes slash commands)
export const USER_INSTALL_SCOPES = ['identify', 'email', 'applications.commands'];

/**
 * Generate Discord OAuth2 authorization URL for user authentication
 * Requests scopes: identify, email
 * @param state - Random state for CSRF protection
 * @returns Authorization URL
 */
export function generateAuthUrl(state: string): string {
  const scopes = USER_AUTH_SCOPES;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    state: state,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Generate Discord OAuth2 authorization URL for user-installable app
 * Requests scopes: identify, email, applications.commands
 * Sets integration_type=1 for user installation (not server installation)
 * @param state - Random state for CSRF protection
 * @returns Authorization URL
 */
export function generateUserInstallUrl(state: string): string {
  const scopes = USER_INSTALL_SCOPES;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    state: state,
    integration_type: '1', // 0 = Guild Install, 1 = User Install
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Discord
 * @returns Token data
 */
export async function exchangeCode(code: string) {
  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    body: data,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Refresh expired access token
 * @param refreshToken - Refresh token
 * @returns New token data
 */
export async function refreshAccessToken(refreshToken: string) {
  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    body: data,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get user info using access token
 * @param accessToken - OAuth2 access token
 * @returns User data
 */
export async function getOAuthUser(accessToken: string) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Revoke access token
 * @param accessToken - Token to revoke
 */
export async function revokeToken(accessToken: string) {
  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    token: accessToken,
  });

  const response = await fetch('https://discord.com/api/v10/oauth2/token/revoke', {
    method: 'POST',
    body: data,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to revoke token: ${response.statusText}`);
  }
}

/**
 * Generate random state for CSRF protection
 * @returns Random string
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
