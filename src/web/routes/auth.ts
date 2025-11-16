import { Router, Request, Response } from 'express';
import { exchangeCode, getOAuthUser } from '../../utils/oauth';
import { pool } from '../../database/config';
import { webLogger } from '../../utils/logger';

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

    // Send success response
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authorization Successful - WhiteCat Bot</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 40px;
              text-align: center;
            }
            .checkmark {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              display: block;
              stroke-width: 3;
              stroke: #4CAF50;
              stroke-miterlimit: 10;
              margin: 0 auto 20px;
              box-shadow: inset 0px 0px 0px #4CAF50;
              animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
            }
            .checkmark__circle {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              stroke-width: 3;
              stroke-miterlimit: 10;
              stroke: #4CAF50;
              fill: none;
              animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
              transform-origin: 50% 50%;
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke {
              100% {
                stroke-dashoffset: 0;
              }
            }
            @keyframes scale {
              0%, 100% {
                transform: none;
              }
              50% {
                transform: scale3d(1.1, 1.1, 1);
              }
            }
            @keyframes fill {
              100% {
                box-shadow: inset 0px 0px 0px 40px #4CAF50;
              }
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            p {
              color: #666;
              margin: 0 0 30px 0;
              font-size: 16px;
              line-height: 1.6;
            }
            .info {
              background: #f5f5f5;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: left;
            }
            .info-item {
              margin: 8px 0;
              font-size: 14px;
              color: #555;
            }
            .info-label {
              font-weight: bold;
              color: #333;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 32px;
              border-radius: 25px;
              font-weight: bold;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: scale(1.05);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h1>✅ Authorization Successful!</h1>
            <p>You have successfully authorized WhiteCat Bot to access your Discord account.</p>
            <div class="info">
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
            </div>
            <p>You can now use all bot commands. You may close this window.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    webLogger.error('OAuth callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authorization Failed - WhiteCat Bot</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              padding: 40px;
              text-align: center;
            }
            .error-icon {
              font-size: 80px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            p {
              color: #666;
              margin: 0 0 20px 0;
              font-size: 16px;
              line-height: 1.6;
            }
            .error-details {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
              font-size: 14px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Authorization Failed</h1>
            <p>We couldn't authorize your Discord account. Please try again.</p>
            <div class="error-details">
              <strong>Error:</strong> ${errorMessage}
            </div>
            <p>If this problem persists, please contact support.</p>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;
