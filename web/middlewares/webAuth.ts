import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';

// Extend Express Request để thêm session info
declare global {
  namespace Express {
    interface Request {
      session?: {
        adminId: number;
        username: string;
        guildId: number | null;
        role: string;
      };
    }
  }
}

const SALT_ROUNDS = 10;
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 giờ

/**
 * Hash mật khẩu
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * So sánh mật khẩu
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Tạo session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Tạo session mới
 */
export async function createSession(
  adminId: number,
  ipAddress: string,
  userAgent: string
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await pool.query(
    `INSERT INTO web_sessions (admin_id, session_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminId, token, ipAddress, userAgent, expiresAt]
  );

  return token;
}

/**
 * Xác thực admin login
 */
export async function authenticateAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; adminId?: number; error?: string }> {
  try {
    const result = await pool.query(
      `SELECT id, password_hash, is_active FROM web_admins WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid username or password' };
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return { success: false, error: 'Account is disabled' };
    }

    const validPassword = await comparePassword(password, admin.password_hash);
    if (!validPassword) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Cập nhật last_login
    await pool.query(
      `UPDATE web_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [admin.id]
    );

    return { success: true, adminId: admin.id };
  } catch (error) {
    webLogger.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Lấy thông tin session từ token
 */
export async function getSessionFromToken(token: string): Promise<{
  adminId: number;
  username: string;
  guildId: number | null;
  role: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT ws.admin_id, wa.username, wa.guild_id, wa.role
       FROM web_sessions ws
       JOIN web_admins wa ON ws.admin_id = wa.id
       WHERE ws.session_token = $1 AND ws.expires_at > CURRENT_TIMESTAMP AND wa.is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      adminId: result.rows[0].admin_id,
      username: result.rows[0].username,
      guildId: result.rows[0].guild_id,
      role: result.rows[0].role,
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
 * Middleware xác thực session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.redirect('/login');
    }
    return;
  }

  getSessionFromToken(token)
    .then((session) => {
      if (!session) {
        if (req.path.startsWith('/api/')) {
          res.status(401).json({ error: 'Invalid or expired session' });
        } else {
          res.redirect('/login');
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

/**
 * Middleware kiểm tra quyền guild
 */
export function requireGuildAccess(guildId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Super admin có quyền truy cập tất cả
    if (req.session.role === 'super_admin' || req.session.guildId === null) {
      next();
      return;
    }

    // Kiểm tra quyền truy cập guild cụ thể
    pool
      .query('SELECT id FROM guilds WHERE id = $1 AND id = $2', [guildId, req.session.guildId])
      .then((result) => {
        if (result.rows.length === 0) {
          res.status(403).json({ error: 'Access denied to this guild' });
          return;
        }
        next();
      })
      .catch((error) => {
        webLogger.error('Guild access check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      });
  };
}

/**
 * Tạo admin mới
 */
export async function createAdmin(
  username: string,
  password: string,
  guildId: number | null = null,
  role: string = 'admin'
): Promise<{ success: boolean; adminId?: number; error?: string }> {
  try {
    // Kiểm tra username đã tồn tại chưa
    const existing = await pool.query('SELECT id FROM web_admins WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return { success: false, error: 'Username already exists' };
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO web_admins (username, password_hash, guild_id, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [username, passwordHash, guildId, role]
    );

    return { success: true, adminId: result.rows[0].id };
  } catch (error) {
    webLogger.error('Create admin error:', error);
    return { success: false, error: 'Failed to create admin' };
  }
}
