import { Router, Request, Response } from 'express';
import { pool } from '../../src/database/config';
import { webLogger } from '../../src/utils/logger';
import { requireAuth, getUserGuilds, hasGuildPermission } from '../middlewares/webAuth';
import { clearAutoResponseCache } from '../../src/handlers/autoResponseHandler';

const router = Router();

// Tất cả API routes đều yêu cầu auth
router.use(requireAuth);

/**
 * Helper: Kiểm tra quyền truy cập guild
 */
async function checkGuildAccess(
  req: Request,
  guildId: string
): Promise<{ allowed: boolean; dbGuildId?: number }> {
  // Kiểm tra guild tồn tại trong database
  const guildResult = await pool.query(
    'SELECT id FROM guilds WHERE guild_id = $1 AND left_at IS NULL',
    [guildId]
  );

  if (guildResult.rows.length === 0) {
    return { allowed: false };
  }

  const dbGuildId = guildResult.rows[0].id;

  // Kiểm tra user có quyền admin trong guild này không
  const userGuilds = await getUserGuilds(req.session!.accessToken);
  const userGuild = userGuilds.find((g) => g.id === guildId);

  if (!userGuild || !hasGuildPermission(userGuild)) {
    return { allowed: false };
  }

  return { allowed: true, dbGuildId };
}

// ==========================================
// AUTO-RESPONSES API
// ==========================================

/**
 * GET /api/guilds/:guildId/auto-responses - Lấy danh sách auto-responses
 */
router.get('/guilds/:guildId/auto-responses', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await pool.query(
      `SELECT id, keyword, response, match_type, is_case_sensitive, is_enabled, created_at, updated_at
       FROM auto_responses
       WHERE guild_id = $1
       ORDER BY keyword ASC`,
      [access.dbGuildId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    webLogger.error('Get auto-responses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guilds/:guildId/auto-responses - Thêm auto-response mới
 */
router.post('/guilds/:guildId/auto-responses', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { keyword, response, match_type, is_case_sensitive } = req.body;

    if (!keyword || !response) {
      res.status(400).json({ error: 'Keyword and response are required' });
      return;
    }

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Kiểm tra keyword đã tồn tại chưa
    const existing = await pool.query(
      'SELECT id FROM auto_responses WHERE guild_id = $1 AND keyword = $2',
      [access.dbGuildId, keyword]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Keyword already exists for this guild' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO auto_responses (guild_id, keyword, response, match_type, is_case_sensitive)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, keyword, response, match_type, is_case_sensitive, is_enabled, created_at`,
      [
        access.dbGuildId,
        keyword,
        response,
        match_type || 'contains',
        is_case_sensitive || false,
      ]
    );

    // Clear cache
    clearAutoResponseCache(guildId);

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    webLogger.error('Create auto-response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/guilds/:guildId/auto-responses/:id - Cập nhật auto-response
 */
router.put('/guilds/:guildId/auto-responses/:id', async (req: Request, res: Response) => {
  try {
    const { guildId, id } = req.params;
    const { keyword, response, match_type, is_case_sensitive, is_enabled } = req.body;

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Kiểm tra auto-response tồn tại
    const existing = await pool.query(
      'SELECT id FROM auto_responses WHERE id = $1 AND guild_id = $2',
      [id, access.dbGuildId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Auto-response not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE auto_responses
       SET keyword = COALESCE($1, keyword),
           response = COALESCE($2, response),
           match_type = COALESCE($3, match_type),
           is_case_sensitive = COALESCE($4, is_case_sensitive),
           is_enabled = COALESCE($5, is_enabled)
       WHERE id = $6 AND guild_id = $7
       RETURNING id, keyword, response, match_type, is_case_sensitive, is_enabled, updated_at`,
      [keyword, response, match_type, is_case_sensitive, is_enabled, id, access.dbGuildId]
    );

    // Clear cache
    clearAutoResponseCache(guildId);

    res.json({ data: result.rows[0] });
  } catch (error) {
    webLogger.error('Update auto-response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/guilds/:guildId/auto-responses/:id - Xóa auto-response
 */
router.delete('/guilds/:guildId/auto-responses/:id', async (req: Request, res: Response) => {
  try {
    const { guildId, id } = req.params;

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM auto_responses WHERE id = $1 AND guild_id = $2 RETURNING id',
      [id, access.dbGuildId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Auto-response not found' });
      return;
    }

    // Clear cache
    clearAutoResponseCache(guildId);

    res.json({ message: 'Auto-response deleted successfully' });
  } catch (error) {
    webLogger.error('Delete auto-response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// BLOCKED CHANNELS API
// ==========================================

/**
 * GET /api/guilds/:guildId/blocked-channels - Lấy danh sách kênh bị chặn
 */
router.get('/guilds/:guildId/blocked-channels', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await pool.query(
      `SELECT id, channel_id, created_at
       FROM auto_response_blocked_channels
       WHERE guild_id = $1
       ORDER BY created_at DESC`,
      [access.dbGuildId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    webLogger.error('Get blocked channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/guilds/:guildId/blocked-channels - Thêm kênh vào danh sách chặn
 */
router.post('/guilds/:guildId/blocked-channels', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { channel_id } = req.body;

    if (!channel_id) {
      res.status(400).json({ error: 'Channel ID is required' });
      return;
    }

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Kiểm tra channel đã bị chặn chưa
    const existing = await pool.query(
      'SELECT id FROM auto_response_blocked_channels WHERE guild_id = $1 AND channel_id = $2',
      [access.dbGuildId, channel_id]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Channel is already blocked' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO auto_response_blocked_channels (guild_id, channel_id)
       VALUES ($1, $2)
       RETURNING id, channel_id, created_at`,
      [access.dbGuildId, channel_id]
    );

    // Clear cache
    clearAutoResponseCache(guildId);

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    webLogger.error('Block channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/guilds/:guildId/blocked-channels/:id - Xóa kênh khỏi danh sách chặn
 */
router.delete('/guilds/:guildId/blocked-channels/:id', async (req: Request, res: Response) => {
  try {
    const { guildId, id } = req.params;

    const access = await checkGuildAccess(req, guildId);
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM auto_response_blocked_channels WHERE id = $1 AND guild_id = $2 RETURNING id',
      [id, access.dbGuildId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Blocked channel not found' });
      return;
    }

    // Clear cache
    clearAutoResponseCache(guildId);

    res.json({ message: 'Channel unblocked successfully' });
  } catch (error) {
    webLogger.error('Unblock channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
