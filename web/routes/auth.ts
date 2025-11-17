import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exchangeCode, getOAuthUser } from '../../src/utils/oauth';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';

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

    // Save user to database (create if not exists, update if exists)
    await pool.query(
      `INSERT INTO users (discord_id, username, last_seen)
       VALUES ($1, $2, NOW())
       ON CONFLICT (discord_id) DO UPDATE SET
         username = EXCLUDED.username,
         last_seen = NOW()`,
      [
        userData.id,
        userData.username,
      ]
    );

    webLogger.info(`OAuth callback successful for user ${userData.username}#${userData.discriminator}`);

    // Build user info HTML
    const userInfoHtml = `
      <div class="info-item">
        <span class="info-label">Username:</span> ${userData.username}
      </div>
      <div class="info-item">
        <span class="info-label">User ID:</span> ${userData.id}
      </div>
      <div class="info-item">
        <span class="info-label">Status:</span> ✅ Connected to WhiteCat Bot
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
