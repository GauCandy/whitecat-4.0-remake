/**
 * Invite Routes
 * Handles bot invitation URLs for both Guild Install and User Install
 */

import { Router, Request, Response } from 'express';
import { config } from '../../config';

const router = Router();

/**
 * GET /api/invite/guild
 * Redirect to Discord OAuth for Guild Install (Add bot to server)
 * Also requests user info access (identify)
 */
router.get('/guild', (req: Request, res: Response) => {
  // Bot invite URL with permissions
  // Scope: bot + applications.commands (Guild Install) + identify (User Info)
  const permissions = '0'; // Adjust permissions as needed (0 = no permissions)

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=${permissions}&integration_type=0&scope=bot+applications.commands+identify`;

  res.redirect(inviteUrl);
});

/**
 * GET /api/invite/user
 * Redirect to Discord OAuth for User Install (Personal authorization)
 * Also requests user info access (identify)
 */
router.get('/user', (req: Request, res: Response) => {
  // User Install URL
  // Scope: applications.commands (User Install) + identify (User Info)
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&integration_type=1&scope=applications.commands+identify`;

  res.redirect(inviteUrl);
});

/**
 * GET /api/invite
 * Redirect to both Guild and User Install (flexible)
 * Also requests user info access (identify)
 */
router.get('/', (req: Request, res: Response) => {
  // Support both integration types
  const permissions = '0';

  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=${permissions}&integration_type=0&integration_type=1&scope=bot+applications.commands+identify`;

  res.redirect(inviteUrl);
});

export default router;
