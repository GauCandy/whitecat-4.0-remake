/**
 * Invite Routes
 * Handles bot invitation URLs for both Guild Install and User Install
 */

import { Router, Request, Response } from 'express';
import { oauthService } from '../../services/oauth.service';

const router = Router();

/**
 * GET /invite/guild
 * Redirect to Discord OAuth for Guild Install (Add bot to server)
 * Automatically sets verification_level = BASIC on callback
 */
router.get('/guild', (req: Request, res: Response) => {
  const permissions = (req.query.permissions as string) || '0';
  const inviteUrl = oauthService.generateOAuthUrl('guild', undefined, permissions);
  res.redirect(inviteUrl);
});

/**
 * GET /invite/user
 * Redirect to Discord OAuth for User Install (Personal authorization)
 * Automatically sets verification_level = BASIC on callback
 */
router.get('/user', (req: Request, res: Response) => {
  const inviteUrl = oauthService.generateOAuthUrl('user');
  res.redirect(inviteUrl);
});

/**
 * GET /invite
 * Redirect to both Guild and User Install (flexible)
 * User can choose: Add to server OR Use personally
 * Automatically sets verification_level = BASIC on callback
 */
router.get('/', (req: Request, res: Response) => {
  const permissions = (req.query.permissions as string) || '0';

  // Generate guild install URL
  const baseUrl = oauthService.generateOAuthUrl('guild', undefined, permissions);
  // Add user install as secondary option
  const inviteUrl = `${baseUrl}&integration_type=1`;

  res.redirect(inviteUrl);
});

export default router;
