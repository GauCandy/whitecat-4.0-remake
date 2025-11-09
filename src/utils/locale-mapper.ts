/**
 * Map Discord locale to bot supported locale
 */

import { SupportedLocale } from '../types/locale';

/**
 * Map Discord's preferredLocale to our supported locales
 * Discord locale reference: https://discord.com/developers/docs/reference#locales
 */
export function mapDiscordLocale(discordLocale: string | null | undefined): SupportedLocale {
  if (!discordLocale) return 'vi'; // Default fallback

  // Extract language code (e.g., "en-US" -> "en", "vi" -> "vi")
  const langCode = discordLocale.toLowerCase().split('-')[0];

  switch (langCode) {
    case 'en': // English (US, GB, etc.)
      return 'en';

    case 'vi': // Vietnamese
      return 'vi';

    // Add more language mappings here as we support more languages
    // case 'ja': // Japanese
    //   return 'ja';
    // case 'ko': // Korean
    //   return 'ko';
    // case 'zh': // Chinese
    //   return 'zh';

    default:
      // Default to Vietnamese for unsupported locales
      return 'vi';
  }
}
