import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';
import {
  generateDashboardOAuthUrl,
  exchangeCodeForTokens,
  getDiscordUser,
  getUserGuilds,
  createSession,
  deleteSession,
  requireAuth,
  hasGuildPermission,
} from '../middlewares/webAuth';

const router = Router();

/**
 * GET /dashboard/login - Redirect đến Discord OAuth
 */
router.get('/login', (req: Request, res: Response) => {
  const oauthUrl = generateDashboardOAuthUrl();
  res.redirect(oauthUrl);
});

/**
 * GET /dashboard/callback - Xử lý OAuth callback từ Discord
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).send('Missing authorization code');
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      res.status(400).send('Failed to exchange code for tokens');
      return;
    }

    // Get user info
    const user = await getDiscordUser(tokens.access_token);
    if (!user) {
      res.status(400).send('Failed to get user info');
      return;
    }

    // Create session
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionToken = await createSession(
      user.id,
      user.username,
      user.avatar,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      ipAddress,
      userAgent
    );

    // Set cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    res.redirect('/dashboard');
  } catch (error) {
    webLogger.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * POST /dashboard/logout - Đăng xuất
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      await deleteSession(token);
    }

    res.clearCookie('session_token');
    res.json({ success: true, redirect: '/dashboard/login' });
  } catch (error) {
    webLogger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /dashboard - Trang chính dashboard
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Lấy danh sách guilds của user từ Discord
    const userGuilds = await getUserGuilds(req.session!.accessToken);

    // Lọc guilds mà user có quyền ADMINISTRATOR
    const adminGuilds = userGuilds.filter(hasGuildPermission);

    // Lấy danh sách guilds từ database (bot đã join)
    const dbGuilds = await pool.query(
      `SELECT guild_id, locale, prefix FROM guilds WHERE left_at IS NULL`
    );

    const dbGuildIds = new Set(dbGuilds.rows.map((g: { guild_id: string }) => g.guild_id));

    // Kết hợp: chỉ hiển thị guilds mà bot đã join VÀ user có quyền admin
    const accessibleGuilds = adminGuilds
      .filter((g) => dbGuildIds.has(g.id))
      .map((g) => {
        const dbGuild = dbGuilds.rows.find((db: { guild_id: string }) => db.guild_id === g.id);
        return {
          guild_id: g.id,
          name: g.name,
          icon: g.icon,
          locale: dbGuild?.locale || 'en-US',
          prefix: dbGuild?.prefix || '!',
        };
      });

    // Đọc template
    const filePath = path.join(__dirname, '../views/dashboard.html');
    fs.readFile(filePath, 'utf-8', (err, html) => {
      if (err) {
        webLogger.error('Failed to read dashboard.html:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Inject dữ liệu
      const injectedHtml = html
        .replace('<!-- USERNAME -->', req.session?.username || 'User')
        .replace('<!-- AVATAR -->', req.session?.avatar || '')
        .replace('<!-- DISCORD_ID -->', req.session?.discordId || '')
        .replace(
          '<!-- GUILDS_DATA -->',
          `<script>window.GUILDS = ${JSON.stringify(accessibleGuilds)};</script>`
        );

      res.send(injectedHtml);
    });
  } catch (error) {
    webLogger.error('Dashboard error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * GET /dashboard/guild/:guildId - Quản lý auto-response cho guild cụ thể
 */
router.get('/guild/:guildId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    // Kiểm tra guild tồn tại trong database
    const guildCheck = await pool.query(
      'SELECT id, guild_id FROM guilds WHERE guild_id = $1 AND left_at IS NULL',
      [guildId]
    );

    if (guildCheck.rows.length === 0) {
      res.status(404).send('Guild not found');
      return;
    }

    // Kiểm tra user có quyền admin trong guild này không
    const userGuilds = await getUserGuilds(req.session!.accessToken);
    const userGuild = userGuilds.find((g) => g.id === guildId);

    if (!userGuild || !hasGuildPermission(userGuild)) {
      res.status(403).send('You do not have permission to manage this server');
      return;
    }

    // Đọc template
    const filePath = path.join(__dirname, '../views/guild-manager.html');
    fs.readFile(filePath, 'utf-8', (err, html) => {
      if (err) {
        webLogger.error('Failed to read guild-manager.html:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Inject dữ liệu
      const injectedHtml = html
        .replace(/<!-- GUILD_ID -->/g, guildId)
        .replace('<!-- GUILD_NAME -->', userGuild.name)
        .replace('<!-- USERNAME -->', req.session?.username || 'User');

      res.send(injectedHtml);
    });
  } catch (error) {
    webLogger.error('Guild manager error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
