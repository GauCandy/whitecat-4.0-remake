import { Router, Request, Response } from 'express';
import { oauthService } from '../../services/oauth.service';
import { userRepository } from '../../database/repositories/user.repository';
import { banRepository } from '../../database/repositories/ban.repository';
import Logger from '../../utils/logger';

const router = Router();

/**
 * Start OAuth flow
 * GET /api/auth/discord?user_id=<discord_user_id>&scope=<basic|verified>
 */
router.get('/discord', (req: Request, res: Response) => {
  const userId = req.query.user_id as string;
  const scope = (req.query.scope as string) || 'verified'; // Default to 'verified'

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing user_id parameter',
    });
  }

  // Validate scope
  if (scope !== 'basic' && scope !== 'verified') {
    return res.status(400).json({
      success: false,
      error: 'Invalid scope parameter. Must be "basic" or "verified"',
    });
  }

  try {
    // Generate OAuth URL with user ID and scope in state
    const authUrl = oauthService.generateAuthUrl(userId, scope as 'basic' | 'verified');

    // Redirect to Discord OAuth
    res.redirect(authUrl);
  } catch (error) {
    Logger.error('Error generating OAuth URL', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth URL',
    });
  }
});

/**
 * OAuth callback handler
 * GET /api/auth/discord/callback?code=<code>&state=<discord_user_id>
 */
router.get('/discord/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string; // Discord user ID

  if (!code || !state) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Authentication Failed</h1>
          <p>Missing required parameters.</p>
          <p>Please try again from Discord.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Complete OAuth flow and save to database
    const result = await oauthService.completeOAuth(code, state);

    // Generate success message based on scope
    const isVerified = result.scope === 'verified';
    const backgroundColor = isVerified
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)';

    const title = isVerified ? 'Xác thực Email thành công!' : 'Ủy quyền thành công!';
    const description = isVerified
      ? 'Bạn đã đồng ý với điều khoản sử dụng và cấp quyền truy cập email.'
      : 'Bạn đã đồng ý với điều khoản sử dụng và ủy quyền cho bot.';
    const features = isVerified
      ? 'Giờ bạn có thể sử dụng tất cả các lệnh của bot, bao gồm các tính năng premium.'
      : 'Giờ bạn có thể sử dụng các lệnh cơ bản của bot.';
    const note = isVerified
      ? ''
      : '<p><strong>Lưu ý:</strong> Một số lệnh nâng cao yêu cầu xác thực email.</p>';

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: ${backgroundColor};
            color: white;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          .success { color: #2ecc71; font-size: 64px; }
          h1 { margin: 20px 0; }
          p { font-size: 18px; line-height: 1.6; }
          .note {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>${title}</h1>
          <p>${description}</p>
          <p>${features}</p>
          <div class="note">
            ${note}
            <p>Bạn có thể đóng tab này và quay lại Discord.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    Logger.success(`OAuth completed for user (scope: ${result.scope})`);
  } catch (error) {
    Logger.error('OAuth callback error', error);

    // Error page
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Authentication Error</h1>
          <p>Something went wrong during authentication.</p>
          <p>Please try again from Discord.</p>
          <p class="error">${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * Check authentication status
 * GET /api/auth/status/:userId
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;

  try {
    const user = await userRepository.getUserByDiscordId(userId);

    if (!user) {
      return res.json({
        success: true,
        authenticated: false,
        status: 'not_registered',
      });
    }

    // Get ban info if user is banned
    let banExpiresAt = null;
    if (user.account_status === 1) {
      const activeBan = await banRepository.getActiveBan(userId);
      banExpiresAt = activeBan?.expires_at || null;
    }

    res.json({
      success: true,
      agreedTerms: user.agreed_terms === 1,
      verified: !!user.email,
      status: user.account_status === 0 ? 'normal' : 'banned',
      banned: user.account_status === 1,
      banExpiresAt: banExpiresAt,
    });
  } catch (error) {
    Logger.error('Error checking auth status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status',
    });
  }
});

export default router;
