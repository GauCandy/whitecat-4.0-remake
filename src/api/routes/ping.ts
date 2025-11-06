import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { query } from '../../database/pool';

const router = Router();

/**
 * Ping endpoint to check bot latency
 * GET /api/ping
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const discordClient = req.app.locals.discordClient as Client | undefined;

  try {
    // Get Discord bot ping
    const botPing = discordClient?.ws.ping ?? null;
    const botReady = discordClient?.isReady() ?? false;

    // Measure database latency
    let dbLatency = null;
    try {
      const dbStart = Date.now();
      await query('SELECT 1');
      dbLatency = Date.now() - dbStart;
    } catch (error) {
      dbLatency = null;
    }

    // Calculate API response time
    const apiLatency = Date.now() - startTime;

    res.json({
      success: true,
      message: 'pong',
      timestamp: new Date().toISOString(),
      latency: {
        api: apiLatency,
        bot: botReady ? botPing : null,
        database: dbLatency,
        unit: 'ms',
      },
      status: {
        bot: botReady ? 'ready' : 'not ready',
        database: dbLatency !== null ? 'connected' : 'disconnected',
      },
      server: {
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to measure latency',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
