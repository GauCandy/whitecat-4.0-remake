import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
};

// Custom log format with colored label at the beginning
const logFormat = printf(({ level, message, timestamp, stack, label }) => {
  let labelStr = '';
  if (label === 'BOT') {
    labelStr = `${colors.cyan}[BOT]${colors.reset} `;
  } else if (label === 'WEB') {
    labelStr = `${colors.magenta}[WEB]${colors.reset} `;
  }
  return `${labelStr}${timestamp} [${level}]: ${stack || message}`;
});

// File log format (no colors)
const fileLogFormat = printf(({ level, message, timestamp, stack, label }) => {
  const labelStr = label ? `[${label}] ` : '';
  return `${labelStr}${timestamp} [${level}]: ${stack || message}`;
});

// Create base logger configuration
const createLogger = (label?: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      label ? winston.format.label({ label }) : winston.format.label({ label: '' })
    ),
    transports: [
      // Console output with colors
      new winston.transports.Console({
        format: combine(colorize(), logFormat),
      }),
      // Error logs
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: fileLogFormat,
      }),
      // Combined logs
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: fileLogFormat,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join('logs', 'exceptions.log'),
        format: fileLogFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join('logs', 'rejections.log'),
        format: fileLogFormat,
      }),
    ],
  });
};

// Default logger (no prefix)
export const logger = createLogger();

// Bot logger
export const botLogger = createLogger('BOT');

// Web logger
export const webLogger = createLogger('WEB');

// Export default
export default logger;
