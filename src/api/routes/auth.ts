import { Router, Request, Response } from 'express';
import { oauthService } from '../../services/oauth.service';
import { userRepository, VerificationLevel } from '../../database/repositories/user.repository';
import { userProfileRepository } from '../../database/repositories/user-profile.repository';
import { banRepository } from '../../database/repositories/ban.repository';
import Logger from '../../utils/logger';

const router = Router();

/**
 * Unified Auth Entry Point
 * GET /auth?user_id=<discord_id>&type=<basic|email>
 *
 * Examples:
 *   /auth?user_id=123...&type=basic  → Basic verification (identify only)
 *   /auth?user_id=123...&type=email  → Email verification (identify + email)
 */
router.get('/', (req: Request, res: Response) => {
  const userId = req.query.user_id as string;
  const type = (req.query.type as string) || 'basic'; // Default: basic

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing user_id parameter',
    });
  }

  // Validate type
  if (type !== 'basic' && type !== 'email') {
    return res.status(400).json({
      success: false,
      error: 'Invalid type parameter. Must be "basic" or "email"',
    });
  }

  try {
    // Map type to flow
    const flowType = type === 'email' ? 'verified' : 'basic';
    const authUrl = oauthService.generateOAuthUrl(flowType, userId);

    res.redirect(authUrl);
  } catch (error) {
    Logger.error('Error generating auth URL', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth URL',
    });
  }
});

/**
 * OAuth Callback Handler (handles ALL flows: invite + auth)
 * GET /auth/callback?code=<code>&state=<state>
 *
 * Flow:
 * 1. Discord redirects here after user authorizes
 * 2. Extract code & state from query params
 * 3. Exchange code for access token
 * 4. Fetch user info from Discord API
 * 5. Save to database
 * 6. Show success page
 */
router.get('/callback', async (req: Request, res: Response) => {
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

    // Generate success message based on flow type
    const isVerified = result.scope === 'verified';
    const isInvite = result.isInvite;

    // Choose background gradient
    const backgroundColor = isVerified
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'  // Purple for verified
      : isInvite
        ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'  // Pink for invite
        : 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)';  // Green for basic

    // Generate title based on flow
    let title: string;
    if (isVerified) {
      title = 'Xác thực Email thành công!';
    } else if (isInvite) {
      title = result.flowType === 'guild' ? 'Bot đã được thêm vào server!' : 'Bot đã được ủy quyền!';
    } else {
      title = 'Ủy quyền thành công!';
    }

    // Generate description
    let description: string;
    if (isVerified) {
      description = 'Bạn đã đồng ý với điều khoản sử dụng và cấp quyền truy cập email.';
    } else if (isInvite && result.flowType === 'guild') {
      description = 'Bot đã được thêm vào server của bạn và bạn đã được xác thực tự động.';
    } else if (isInvite && result.flowType === 'user') {
      description = 'Bạn đã ủy quyền sử dụng bot cá nhân và được xác thực tự động.';
    } else {
      description = 'Bạn đã đồng ý với điều khoản sử dụng và ủy quyền cho bot.';
    }

    // Generate features text
    const features = isVerified
      ? 'Giờ bạn có thể sử dụng tất cả các lệnh của bot, bao gồm các tính năng premium.'
      : 'Giờ bạn có thể sử dụng các lệnh cơ bản của bot.';

    // Note for non-verified users
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

    Logger.success(`OAuth completed for user (${result.isInvite ? 'INVITE' : 'AUTH'}: ${result.scope})`);
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
 * Check User Authentication Status
 * GET /auth/status/:userId
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

    // Get email from user_profiles if verified
    let email = null;
    if (user.verification_level === VerificationLevel.VERIFIED) {
      const profile = await userProfileRepository.getProfileByDiscordId(userId);
      email = profile?.email || null;
    }

    res.json({
      success: true,
      verificationLevel: user.verification_level, // 0=not verified, 1=basic, 2=verified
      hasBasicAuth: user.verification_level >= VerificationLevel.BASIC,
      hasEmailVerification: user.verification_level === VerificationLevel.VERIFIED,
      email: email, // Only if verified
      status: user.account_status === 0 ? 'normal' : 'banned',
      banned: user.account_status === 1,
      banExpiresAt: banExpiresAt,

      // Legacy fields for backwards compatibility
      agreedTerms: user.verification_level >= VerificationLevel.BASIC,
      verified: user.verification_level === VerificationLevel.VERIFIED,
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
