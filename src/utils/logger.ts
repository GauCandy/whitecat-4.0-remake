/**
 * Professional Logger Utility
 * Provides colored, timestamped, and well-formatted console output
 */

// ANSI Color Codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Log level icons
const icons = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
  debug: '⚙',
  database: '🗄',
  bot: '🤖',
  web: '🌐',
  system: '⚡',
};

/**
 * Get current timestamp in HH:MM:SS format
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format log message with timestamp and color
 */
function formatLog(
  level: string,
  color: string,
  icon: string,
  message: string
): void {
  const timestamp = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
  const levelTag = `${color}${colors.bright}${icon} ${level}${colors.reset}`;
  console.log(`${timestamp} ${levelTag} ${message}`);
}

/**
 * Logger class with various log levels
 */
export class Logger {
  /**
   * Info log - General information
   */
  static info(message: string): void {
    formatLog('INFO', colors.blue, icons.info, message);
  }

  /**
   * Success log - Successful operations
   */
  static success(message: string): void {
    formatLog('SUCCESS', colors.green, icons.success, message);
  }

  /**
   * Warning log - Warning messages
   */
  static warn(message: string): void {
    formatLog('WARNING', colors.yellow, icons.warning, message);
  }

  /**
   * Error log - Error messages
   */
  static error(message: string, error?: any): void {
    formatLog('ERROR', colors.red, icons.error, message);
    if (error) {
      console.error(`${colors.red}${colors.dim}`, error, colors.reset);
    }
  }

  /**
   * Debug log - Debug information (only in development)
   */
  static debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      formatLog('DEBUG', colors.magenta, icons.debug, message);
    }
  }

  /**
   * Database log - Database related messages
   */
  static database(message: string): void {
    formatLog('DATABASE', colors.cyan, icons.database, message);
  }

  /**
   * Bot log - Discord bot related messages
   */
  static bot(message: string): void {
    formatLog('BOT', colors.magenta, icons.bot, message);
  }

  /**
   * Web log - Web server related messages
   */
  static web(message: string): void {
    formatLog('WEB', colors.cyan, icons.web, message);
  }

  /**
   * System log - System related messages
   */
  static system(message: string): void {
    formatLog('SYSTEM', colors.yellow, icons.system, message);
  }

  /**
   * Print a separator line
   */
  static separator(): void {
    console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`);
  }

  /**
   * Print a blank line
   */
  static blank(): void {
    console.log('');
  }

  /**
   * Print a header with box drawing
   */
  static header(title: string): void {
    const width = 60;
    const padding = Math.floor((width - title.length - 2) / 2);
    const leftPad = ' '.repeat(padding);
    const rightPad = ' '.repeat(width - title.length - padding - 2);

    console.log(`${colors.cyan}${colors.bright}`);
    console.log(`╔${'═'.repeat(width)}╗`);
    console.log(`║${leftPad}${title}${rightPad}║`);
    console.log(`╚${'═'.repeat(width)}╝`);
    console.log(colors.reset);
  }

  /**
   * Print a section title
   */
  static section(title: string): void {
    console.log(`\n${colors.cyan}${colors.bright}▶ ${title}${colors.reset}`);
  }

  /**
   * Print a box with content
   */
  static box(lines: string[]): void {
    const maxLength = Math.max(...lines.map(l => l.length));
    const width = maxLength + 4;

    console.log(`${colors.cyan}┌${'─'.repeat(width)}┐${colors.reset}`);
    lines.forEach(line => {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(`${colors.cyan}│${colors.reset}  ${line}${padding}  ${colors.cyan}│${colors.reset}`);
    });
    console.log(`${colors.cyan}└${'─'.repeat(width)}┘${colors.reset}`);
  }

  /**
   * Clear console
   */
  static clear(): void {
    // Clear console and reset cursor
    console.clear();
    // Also clear scrollback buffer (works in most terminals)
    process.stdout.write('\x1Bc');
  }

  /**
   * Print startup banner
   */
  static banner(): void {
    this.clear();
    const banner = [
      '',
      `${colors.cyan}${colors.bright}  ╦ ╦╦ ╦╦╔╦╗╔═╗╔═╗╔═╗╔╦╗  ${colors.reset}`,
      `${colors.cyan}${colors.bright}  ║║║╠═╣║ ║ ║╣ ║  ╠═╣ ║   ${colors.reset}`,
      `${colors.cyan}${colors.bright}  ╚╩╝╩ ╩╩ ╩ ╚═╝╚═╝╩ ╩ ╩   ${colors.reset}`,
      '',
      `${colors.gray}  A modern Discord bot built with TypeScript${colors.reset}`,
      `${colors.gray}  Created by Gấu Kẹo (GauCandy)${colors.reset}`,
      '',
    ];

    console.log(banner.join('\n'));
  }

  /**
   * Print loading animation (single line)
   */
  static loading(message: string): void {
    process.stdout.write(`${colors.blue}${icons.system} ${message}...${colors.reset}`);
  }

  /**
   * Clear current line and print new message
   */
  static clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }

  /**
   * Print a list item
   */
  static listItem(item: string, status: 'pending' | 'success' | 'error' = 'pending'): void {
    const statusIcon = {
      pending: `${colors.gray}○${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      error: `${colors.red}✗${colors.reset}`,
    };

    console.log(`  ${statusIcon[status]} ${item}`);
  }

  /**
   * Print table
   */
  static table(data: Record<string, string>): void {
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

    Object.entries(data).forEach(([key, value]) => {
      const padding = ' '.repeat(maxKeyLength - key.length);
      console.log(`  ${colors.cyan}${key}:${colors.reset}${padding} ${value}`);
    });
  }
}

// Export default logger instance
export default Logger;
