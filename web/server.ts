/**
 * Express Web Server for OAuth2 Callbacks
 * Handles Discord OAuth2 authorization callbacks and health checks
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { webLogger } from '../src/utils/logger';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import apiRoutes from './routes/api';

const app = express();

// Configuration
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  webLogger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// Root landing page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhiteCat Bot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 600px;
      background: rgba(255, 255, 255, 0.1);
      padding: 40px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    h1 { font-size: 3em; margin-bottom: 10px; }
    p { font-size: 1.2em; margin-bottom: 30px; opacity: 0.9; }
    .btn {
      display: inline-block;
      padding: 15px 40px;
      margin: 10px;
      background: #5865f2;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
    }
    .features {
      margin-top: 30px;
      text-align: left;
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: 10px;
    }
    .features li {
      margin: 10px 0;
      list-style: none;
    }
    .features li:before {
      content: "✓ ";
      color: #4ade80;
      font-weight: bold;
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐱 WhiteCat Bot</h1>
    <p>Discord Bot with Economy, Giveaways & Auto-Response</p>

    <a href="/dashboard/login" class="btn">🌐 Open Dashboard</a>
    <a href="https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID || 'YOUR_CLIENT_ID'}&scope=bot+applications.commands" class="btn btn-secondary">➕ Invite Bot</a>

    <div class="features">
      <h3>Features:</h3>
      <ul>
        <li>Economy System (coins, daily rewards, transfers)</li>
        <li>Giveaway System with button entries</li>
        <li>Auto-Response with keyword matching</li>
        <li>50+ Fun & Roleplay commands</li>
        <li>Multi-language support (EN/VI)</li>
      </ul>
    </div>
  </div>
</body>
</html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  webLogger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

export default app;
