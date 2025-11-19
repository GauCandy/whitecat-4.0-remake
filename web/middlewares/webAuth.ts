import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';

// Extend Express Request để thêm session info
declare global {
  namespace Express {
    interface Request {
      session?: {
        discordId: string;
        username: string;
        avatar: string | null;
        accessToken: string;
      };
    }
  }
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 ngày

/**
 * Tạo session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Tạo URL OAuth cho dashboard login
 */
export function generateDashboardOAuthUrl(): string {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.DASHBOARD_REDIRECT_URI || `${process.env.REDIRECT_URI?.replace('/auth/callback', '')}/dashboard/callback`;

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const redirectUri = process.env.DASHBOARD_REDIRECT_URI || `${process.env.REDIRECT_URI?.replace('/auth/callback', '')}/dashboard/callback`;

    const response = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (error) {
    webLogger.error('Token exchange error:', error);
    return null;
  }
}

/**
 * Lấy thông tin user từ Discord
 */
export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  avatar: string | null;
} | null> {
  try {
    const response = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      id: response.data.id,
      username: response.data.username,
      avatar: response.data.avatar,
    };
  } catch (error) {
    webLogger.error('Get Discord user error:', error);
    return null;
  }
}

/**
 * Lấy danh sách guilds của user
 */
export async function getUserGuilds(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}>> {
  try {
    const response = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    webLogger.error('Get user guilds error:', error);
    return [];
  }
}

/**
 * Tạo session mới
 */
export async function createSession(
  discordId: string,
  username: string,
  avatar: string | null,
  accessToken: string,
  refreshToken: string | null,
  tokenExpiresIn: number,
  ipAddress: string,
  userAgent: string
): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);

  await pool.query(
    `INSERT INTO web_sessions
     (discord_id, discord_username, discord_avatar, access_token, refresh_token, token_expires_at, session_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [discordId, username, avatar, accessToken, refreshToken, tokenExpiresAt, sessionToken, ipAddress, userAgent, expiresAt]
  );

  return sessionToken;
}

/**
 * Lấy thông tin session từ token
 */
export async function getSessionFromToken(token: string): Promise<{
  discordId: string;
  username: string;
  avatar: string | null;
  accessToken: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT discord_id, discord_username, discord_avatar, access_token
       FROM web_sessions
       WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      discordId: result.rows[0].discord_id,
      username: result.rows[0].discord_username,
      avatar: result.rows[0].discord_avatar,
      accessToken: result.rows[0].access_token,
    };
  } catch (error) {
    webLogger.error('Session lookup error:', error);
    return null;
  }
}

/**
 * Xóa session
 */
export async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM web_sessions WHERE session_token = $1', [token]);
}

/**
 * Xóa các session hết hạn
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await pool.query('DELETE FROM web_sessions WHERE expires_at < CURRENT_TIMESTAMP');
}

/**
 * Kiểm tra user có quyền quản lý guild không
 * (Owner hoặc có ADMINISTRATOR permission)
 */
export function hasGuildPermission(guild: { owner: boolean; permissions: string }): boolean {
  if (guild.owner) return true;

  // ADMINISTRATOR = 0x8
  const permissions = BigInt(guild.permissions);
  const ADMINISTRATOR = BigInt(0x8);

  return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
}

/**
 * Middleware xác thực session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session_token;

  if (!token) {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.redirect('/dashboard/login');
    }
    return;
  }

  getSessionFromToken(token)
    .then((session) => {
      if (!session) {
        if (req.path.startsWith('/api/')) {
          res.status(401).json({ error: 'Invalid or expired session' });
        } else {
          res.redirect('/dashboard/login');
        }
        return;
      }

      req.session = session;
      next();
    })
    .catch((error) => {
      webLogger.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
}
