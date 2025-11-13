import { Router, Request, Response } from 'express';
import { exchangeCode, getOAuthUser } from '../../utils/oauth';
import { storeOAuthTokens } from '../../middlewares/authorization';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * OAuth2 callback endpoint
 * Discord redirects here after user authorizes
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // Validate parameters
  if (!code || typeof code !== 'string') {
    logger.error('OAuth callback: Missing or invalid code');
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #2c2f33; color: #fff; }
          .error { color: #f04747; font-size: 24px; margin: 20px 0; }
          .message { color: #99aab5; font-size: 16px; }
          a { color: #5865f2; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Authorization Failed</h1>
        <p class="message">Missing authorization code. Please try again.</p>
        <p><a href="https://discord.com">Return to Discord</a></p>
      </body>
      </html>
    `);
  }

  try {
    logger.info(`OAuth callback received for code: ${code.substring(0, 10)}...`);

    // Exchange code for access token
    const tokenData = await exchangeCode(code);
    logger.info('Successfully exchanged code for tokens');

    // Get user info
    const userData = await getOAuthUser(tokenData.access_token);
    logger.info(`User authorized: ${userData.username}#${userData.discriminator} (${userData.id})`);

    // Extract email if email scope granted
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : [];
    const userEmail = scopes.includes('email') ? userData.email : undefined;

    if (userEmail) {
      logger.info(`Email scope granted for user ${userData.id}: ${userEmail}`);
    }

    // Store tokens in database
    await storeOAuthTokens(
      userData.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in,
      tokenData.scope,
      userEmail
    );

    logger.info(`Tokens stored for user ${userData.id}`);

    // Success response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Successful</title>
        <meta http-equiv="refresh" content="5;url=https://discord.com/channels/@me">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }
          .container {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 40px;
            max-width: 500px;
            margin: 0 auto;
            backdrop-filter: blur(10px);
          }
          .success {
            color: #57f287;
            font-size: 48px;
            margin: 20px 0;
          }
          h1 { font-size: 32px; margin: 20px 0; }
          .message {
            color: #fff;
            font-size: 18px;
            line-height: 1.6;
            margin: 20px 0;
          }
          .user-info {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .redirect {
            color: #b9bbbe;
            font-size: 14px;
            margin-top: 30px;
          }
          a { color: #00aff4; text-decoration: none; font-weight: bold; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>Authorization Successful!</h1>
          <div class="user-info">
            <strong>${userData.username}#${userData.discriminator}</strong>
          </div>
          <p class="message">
            Your account has been successfully linked to WhiteCat Bot!<br>
            You can now use all bot commands in Discord.
          </p>
          <p class="message">
            <strong>Granted Permissions:</strong><br>
            • Read your Discord user info (identify)<br>
            • Access your email address (email)<br>
            • Use bot slash commands anywhere (applications.commands - User Install)
          </p>
          <p class="redirect">
            Redirecting to Discord in 5 seconds...<br>
            Or <a href="https://discord.com/channels/@me">click here</a>
          </p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('OAuth callback error:', error);

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #2c2f33; color: #fff; }
          .error { color: #f04747; font-size: 24px; margin: 20px 0; }
          .message { color: #99aab5; font-size: 16px; line-height: 1.6; }
          .details { background: #1e2124; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; }
          a { color: #5865f2; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Authorization Error</h1>
        <p class="message">
          An error occurred while processing your authorization.<br>
          Please try again or contact support if the issue persists.
        </p>
        <div class="details">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <p><a href="https://discord.com">Return to Discord</a></p>
      </body>
      </html>
    `);
  }
});

export default router;
