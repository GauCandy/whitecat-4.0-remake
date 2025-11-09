import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Client } from 'discord.js';
import { config } from '../config';
import Logger from '../utils/logger';

// Import routes
import healthRouter from './routes/health';
import pingRouter from './routes/ping';
import authRouter from './routes/auth';
import inviteRouter from './routes/invite';

export class APIServer {
  private app: Application;
  private server: any;
  private discordClient: Client | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Set Discord client for API access
   */
  public setDiscordClient(client: Client): void {
    this.discordClient = client;
    // Make client available to routes via app.locals
    this.app.locals.discordClient = client;
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS
    this.app.use(cors({
      origin: '*', // Configure this properly in production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from public directory
    const publicPath = path.join(__dirname, '..', '..', 'public');
    this.app.use(express.static(publicPath));

    // Request logging middleware (skip frequent endpoints to avoid spam)
    this.app.use((req, res, next) => {
      const skipLogging = ['/api/ping', '/api/health', '/favicon.ico'];
      if (!skipLogging.includes(req.path)) {
        Logger.api(`${req.method} ${req.path}`);
      }
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Auth routes (at root level for simple callback URL)
    this.app.use('/auth', authRouter);
    this.app.use('/invite', inviteRouter);

    // API routes
    this.app.use('/api/ping', pingRouter);
    this.app.use('/api/health', healthRouter);

    // Root endpoint - serve landing page
    this.app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
    });

    // API info endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'WhiteCat Discord Bot API',
        version: '1.0.0',
        endpoints: {
          ping: '/api/ping',
          health: '/api/health',
          auth: '/api/auth',
          invite: '/invite',
        },
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      Logger.error('API Error:', err);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    });
  }

  /**
   * Start the API server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(config.apiPort, () => {
          Logger.success(`API server started on port ${config.apiPort}`);
          Logger.info(`API URL: http://localhost:${config.apiPort}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          Logger.error('Failed to start API server', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: Error) => {
          if (err) {
            Logger.error('Error closing API server', err);
            reject(err);
          } else {
            Logger.success('API server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }
}

export default APIServer;
