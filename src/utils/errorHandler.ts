/**
 * Error Handler Utility
 * Provides centralized error handling with logging and user-friendly messages
 */

import { botLogger } from './logger';
import { t, Locale } from './i18n';
import { randomBytes } from 'crypto';

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Log error with details and return user-friendly message
 *
 * @param error - The error object
 * @param context - Context information (command name, user ID, etc.)
 * @param locale - User's locale for i18n
 * @returns User-friendly error message with error ID
 */
export function logError(
  error: unknown,
  context: {
    command?: string;
    userId?: string;
    guildId?: string;
    action?: string;
  },
  locale: Locale | string = Locale.EnglishUS
): string {
  const errorId = generateErrorId();

  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Build context string
  const contextParts: string[] = [];
  if (context.command) contextParts.push(`Command: ${context.command}`);
  if (context.action) contextParts.push(`Action: ${context.action}`);
  if (context.userId) contextParts.push(`User: ${context.userId}`);
  if (context.guildId) contextParts.push(`Guild: ${context.guildId}`);
  const contextStr = contextParts.length > 0 ? ` | ${contextParts.join(', ')}` : '';

  // Log detailed error
  botLogger.error(
    `[ERROR ID: ${errorId}]${contextStr}\n` +
    `Message: ${errorMessage}\n` +
    `${errorStack ? `Stack: ${errorStack}` : ''}`
  );

  // Return user-friendly message with error ID
  return t(locale, 'common.error_logged', { errorId });
}

/**
 * Log error specifically for giveaway operations
 *
 * @param error - The error object
 * @param giveawayId - Giveaway ID if applicable
 * @param userId - User ID if applicable
 * @param action - Action being performed
 * @param locale - User's locale
 * @returns User-friendly error message
 */
export function logGiveawayError(
  error: unknown,
  giveawayId: number | string | undefined,
  userId: string | undefined,
  action: string,
  locale: Locale | string = Locale.EnglishUS
): string {
  return logError(
    error,
    {
      command: 'giveaway',
      action: giveawayId ? `${action} (Giveaway: ${giveawayId})` : action,
      userId,
    },
    locale
  );
}
