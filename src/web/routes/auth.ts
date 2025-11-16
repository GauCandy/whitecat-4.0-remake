import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exchangeCode, getOAuthUser } from '../../utils/oauth';
import { pool } from '../../database/config';
import { webLogger } from '../../utils/logger';

// Load HTML templates
const successHtml = readFileSync(join(__dirname, '../views/auth-success.html'), 'utf-8');
const errorHtml = readFileSync(join(__dirname, '../views/auth-error.html'), 'utf-8');

const router = Router();

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

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Save tokens to database
    await pool.query(
      `UPDATE users
       SET oauth_access_token = $1,
           oauth_refresh_token = $2,
           oauth_token_expires_at = $3,
           oauth_scopes = $4,
           is_authorized = true,
           email = COALESCE($5, email),
           last_seen = NOW()
       WHERE discord_id = $6`,
      [
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
        tokenData.scope,
        userData.email || null,
        userData.id,
      ]
    );

    webLogger.info(`OAuth callback successful for user ${userData.username}#${userData.discriminator}`);

    // Build user info HTML
    const userInfoHtml = `
      <div class="info-item">
        <span class="info-label">Username:</span> ${userData.username}#${userData.discriminator}
      </div>
      <div class="info-item">
        <span class="info-label">User ID:</span> ${userData.id}
      </div>
      ${userData.email ? `<div class="info-item"><span class="info-label">Email:</span> ${userData.email}</div>` : ''}
      <div class="info-item">
        <span class="info-label">Scopes:</span> ${tokenData.scope}
      </div>
    `;

    // Send success response
    res.send(successHtml.replace('<!-- User info will be injected here -->', userInfoHtml));
  } catch (error) {
    webLogger.error('OAuth callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetailsHtml = `<strong>Error:</strong> ${errorMessage}`;

    // Send error response
    res.status(500).send(errorHtml.replace('<!-- Error message will be injected here -->', errorDetailsHtml));
  }
});

export default router;
