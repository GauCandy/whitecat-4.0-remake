import { Router, Request, Response } from 'express';
import { oauthService } from '../../services/oauth.service';
import { userRepository } from '../../database/repositories/user.repository';
import Logger from '../../utils/logger';

const router = Router();

/**
 * Start OAuth flow
 * GET /api/auth/discord?user_id=<discord_user_id>
 */
router.get('/discord', (req: Request, res: Response) => {
  const userId = req.query.user_id as string;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing user_id parameter',
    });
  }

  try {
    // Generate OAuth URL with user ID in state
    const authUrl = oauthService.generateAuthUrl(userId);

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
    await oauthService.completeOAuth(code, state);

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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          <h1>Xác thực thành công!</h1>
          <p>Bạn đã đồng ý với điều khoản sử dụng và cấp quyền truy cập email.</p>
          <p>Giờ bạn có thể sử dụng tất cả các lệnh của bot trong Discord.</p>
          <div class="note">
            <p><strong>Lưu ý:</strong> Bạn có thể đóng tab này và quay lại Discord.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    Logger.success(`OAuth completed for user ${state}`);
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
 * Simple terms agreement (no OAuth, no email collection)
 * GET /api/auth/terms?user_id=<discord_user_id>
 */
router.get('/terms', async (req: Request, res: Response) => {
  const userId = req.query.user_id as string;

  if (!userId) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Request</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Invalid Request</h1>
          <p>Missing user_id parameter.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Get or create user
    const user = await userRepository.getOrCreateUser({
      discord_id: userId,
    });

    // Agree to terms
    await userRepository.agreeToTerms(userId);

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Terms Accepted</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
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
          <h1>Đã đồng ý điều khoản!</h1>
          <p>Bạn đã đồng ý với điều khoản sử dụng WhiteCat Bot.</p>
          <p>Giờ bạn có thể sử dụng các lệnh cơ bản của bot trong Discord.</p>
          <div class="note">
            <p><strong>Lưu ý:</strong> Một số lệnh nâng cao yêu cầu xác thực email qua Discord OAuth.</p>
            <p>Bạn có thể đóng tab này và quay lại Discord.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    Logger.success(`User ${userId} agreed to terms (basic verification)`);
  } catch (error) {
    Logger.error('Terms agreement error', error);

    // Error page
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Error</h1>
          <p>Something went wrong while processing your agreement.</p>
          <p>Please try again from Discord.</p>
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

    res.json({
      success: true,
      agreedTerms: user.agreed_terms === 1,
      verified: !!user.email,
      status: user.account_status === 0 ? 'normal' : 'banned',
      banned: user.account_status === 1,
      banExpiresAt: user.ban_expires_at,
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
