import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';
import {
  authenticateAdmin,
  createSession,
  deleteSession,
  requireAuth,
  getSessionFromToken,
} from '../middlewares/webAuth';

const router = Router();

/**
 * GET /dashboard/login - Trang đăng nhập
 */
router.get('/login', (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../views/login.html');
  fs.readFile(filePath, 'utf-8', (err, html) => {
    if (err) {
      webLogger.error('Failed to read login.html:', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send(html);
  });
});

/**
 * POST /dashboard/login - Xử lý đăng nhập
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await authenticateAdmin(username, password);

    if (!result.success || !result.adminId) {
      res.status(401).json({ error: result.error || 'Authentication failed' });
      return;
    }

    // Tạo session
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const token = await createSession(result.adminId, ipAddress, userAgent);

    // Set cookie
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    });

    res.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    webLogger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    // Lấy danh sách guilds mà admin có quyền truy cập
    let guildsQuery = `
      SELECT g.id, g.guild_id, g.locale, g.prefix
      FROM guilds g
      WHERE g.left_at IS NULL
    `;

    const queryParams: any[] = [];

    // Nếu không phải super_admin, chỉ lấy guild được gán
    if (req.session?.role !== 'super_admin' && req.session?.guildId !== null) {
      guildsQuery += ' AND g.id = $1';
      queryParams.push(req.session?.guildId);
    }

    guildsQuery += ' ORDER BY g.joined_at DESC';

    const guildsResult = await pool.query(guildsQuery, queryParams);

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
        .replace('<!-- USERNAME -->', req.session?.username || 'Admin')
        .replace('<!-- ROLE -->', req.session?.role || 'admin')
        .replace(
          '<!-- GUILDS_DATA -->',
          `<script>window.GUILDS = ${JSON.stringify(guildsResult.rows)};</script>`
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

    // Kiểm tra quyền truy cập guild
    const guildCheck = await pool.query(
      'SELECT id, guild_id FROM guilds WHERE guild_id = $1 AND left_at IS NULL',
      [guildId]
    );

    if (guildCheck.rows.length === 0) {
      res.status(404).send('Guild not found');
      return;
    }

    const guild = guildCheck.rows[0];

    // Kiểm tra quyền
    if (
      req.session?.role !== 'super_admin' &&
      req.session?.guildId !== null &&
      req.session?.guildId !== guild.id
    ) {
      res.status(403).send('Access denied');
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
        .replace('<!-- GUILD_ID -->', guildId)
        .replace('<!-- USERNAME -->', req.session?.username || 'Admin');

      res.send(injectedHtml);
    });
  } catch (error) {
    webLogger.error('Guild manager error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
