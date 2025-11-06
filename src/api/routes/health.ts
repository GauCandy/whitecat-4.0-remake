import { Router, Request, Response } from 'express';
import { testConnection } from '../../database/pool';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database connection (silent mode to avoid console spam)
    const dbConnected = await testConnection(true);

    const healthStatus = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'online',
        database: dbConnected ? 'connected' : 'disconnected',
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
      },
    };

    res.status(dbConnected ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
