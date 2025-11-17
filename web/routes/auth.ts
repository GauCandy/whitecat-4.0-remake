import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exchangeCode, getOAuthUser } from '../../src/utils/oauth';
import { registerUser, storeOAuthTokens } from '../../src/middlewares/authorization';
import { webLogger } from '../../src/utils/logger';

// Load HTML templates
const successHtml = readFileSync(join(__dirname, '../views/auth-success.html'), 'utf-8');
const errorHtml = readFileSync(join(__dirname, '../views/auth-error.html'), 'utf-8');

const router = Router();

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * OAuth2 callback endpoint
 * Handles Discord OAuth2 authorization callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode(code);
    const userData = await getOAuthUser(tokenData.access_token);

    // Register user (saves to users + user_profiles tables)
    await registerUser(
      userData.id,
      userData.username,
      userData.discriminator,
      userData.avatar
    );

    // Store OAuth tokens (saves to user_oauth + user_profiles tables)
    await storeOAuthTokens(
      userData.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in,
      tokenData.scope,
      userData.email // Save email if provided by OAuth
    );

    webLogger.info(`OAuth callback successful for user ${userData.username}#${userData.discriminator}`);

    // Build user info HTML (with XSS protection)
    const userInfoHtml = `
      <div class="user-info-item">
        <span class="user-info-label">Username</span>
        <span class="user-info-value">${escapeHtml(userData.username)}</span>
      </div>
      <div class="user-info-item">
        <span class="user-info-label">User ID</span>
        <span class="user-info-value">${escapeHtml(userData.id)}</span>
      </div>
      <div class="user-info-item">
        <span class="user-info-label">Status</span>
        <span class="user-info-value">Connected</span>
      </div>
    `;

    // Send success response
    res.send(successHtml.replace('<!-- User info will be injected here -->', userInfoHtml));
  } catch (error) {
    webLogger.error('OAuth callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetailsHtml = escapeHtml(errorMessage);

    // Send error response
    res.status(500).send(errorHtml.replace('<!-- Error message will be injected here -->', errorDetailsHtml));
  }
});

export default router;
