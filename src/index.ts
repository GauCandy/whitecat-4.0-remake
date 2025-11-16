import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { logger, botLogger, webLogger } from './utils/logger';
import { loadCommands } from './handlers/commandHandler';
import { loadTextCommands } from './handlers/textCommandHandler';
import { loadEvents } from './handlers/eventHandler';
import { initI18n } from './utils/i18n';
import { GiveawayManager } from './managers/giveawayManager';
import authRoutes from './web/routes/auth';
import type { ExtendedClient } from './types/client';
import type { Command } from './types/command';
import type { TextCommand } from './types/textCommand';

// Load environment variables
config();

// Express app setup
const app = express();
const PORT = parseInt(process.env.API_PORT || '3000', 10);
const HOST = '0.0.0.0'; // Listen on all network interfaces
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  webLogger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint - Serve homepage
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'web', 'views', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  webLogger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Create Discord client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
}) as ExtendedClient;

// Initialize collections
client.commands = new Collection<string, Command>();
client.textCommands = new Collection<string, TextCommand>();
client.cooldowns = new Collection<string, Collection<string, number>>();

// Initialize giveaway manager
const giveawayManager = new GiveawayManager(client);
(client as any).giveawayManager = giveawayManager;

// Startup function
async function start(): Promise<void> {
  try {
    logger.info('🚀 Starting WhiteCat Bot & Web Server...');

    // Start web server
    app.listen(PORT, HOST, () => {
      webLogger.info(`🌐 Web server listening on ${HOST}:${PORT} (http://localhost:${PORT})`);
    });

    // Initialize i18n system
    initI18n();

    // Load slash commands
    await loadCommands(client);

    // Load text/prefix commands
    await loadTextCommands(client);

    // Load events
    await loadEvents(client);

    // Login to Discord
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN is not defined in .env file');
    }

    await client.login(token);

    botLogger.info('✅ Bot started successfully!');
  } catch (error) {
    logger.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

// Global error handling
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the bot
void start();
