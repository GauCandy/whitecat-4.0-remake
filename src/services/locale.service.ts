/**
 * Locale Service
 * Handles i18n (internationalization) for the bot
 */

import fs from 'fs';
import path from 'path';
import { SupportedLocale, LocaleData } from '../types/locale';
import { guildRepository } from '../database/repositories/guild.repository';
import Logger from '../utils/logger';

class LocaleService {
  private locales: Map<SupportedLocale, LocaleData> = new Map();
  private defaultLocale: SupportedLocale = 'vi';

  constructor() {
    this.loadLocales();
  }

  /**
   * Load all locale files from the locales directory
   */
  private loadLocales(): void {
    const localesDir = path.join(__dirname, '..', 'locales');
    const localeFiles = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));

    for (const file of localeFiles) {
      const locale = file.replace('.json', '') as SupportedLocale;
      const filePath = path.join(localesDir, file);

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LocaleData;
        this.locales.set(locale, data);
        Logger.info(`Loaded locale: ${locale}`);
      } catch (error) {
        Logger.error(`Failed to load locale file ${file}`, error);
      }
    }

    if (this.locales.size === 0) {
      Logger.error('No locale files loaded! Bot may not function properly.');
    }
  }

  /**
   * Get a translation string by path
   * @param locale - The locale to use
   * @param path - Dot-notation path to the translation (e.g., 'common.error')
   * @param params - Parameters to replace in the translation
   * @returns Translated string
   */
  public t(locale: SupportedLocale, path: string, params?: Record<string, any>): string {
    const localeData = this.locales.get(locale) || this.locales.get(this.defaultLocale);

    if (!localeData) {
      Logger.warn(`No locale data found for ${locale}, using key as fallback`);
      return path;
    }

    // Navigate through the nested object using the path
    const keys = path.split('.');
    let value: any = localeData;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback to default locale if key not found
        const defaultData = this.locales.get(this.defaultLocale);
        if (defaultData) {
          value = defaultData;
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k];
            } else {
              Logger.warn(`Translation key not found: ${path} in ${locale}`);
              return path;
            }
          }
        } else {
          Logger.warn(`Translation key not found: ${path} in ${locale}`);
          return path;
        }
      }
    }

    if (typeof value !== 'string') {
      Logger.warn(`Translation value is not a string: ${path}`);
      return path;
    }

    // Replace parameters in the string
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }
    }

    return value;
  }

  /**
   * Get the entire locale data object
   * @param locale - The locale to get
   * @returns Locale data object
   */
  public getLocaleData(locale: SupportedLocale): LocaleData | undefined {
    return this.locales.get(locale) || this.locales.get(this.defaultLocale);
  }

  /**
   * Get all available locales
   * @returns Array of supported locales
   */
  public getAvailableLocales(): SupportedLocale[] {
    return Array.from(this.locales.keys());
  }

  /**
   * Set the default locale
   * @param locale - The locale to set as default
   */
  public setDefaultLocale(locale: SupportedLocale): void {
    if (this.locales.has(locale)) {
      this.defaultLocale = locale;
      Logger.info(`Default locale set to: ${locale}`);
    } else {
      Logger.warn(`Locale ${locale} not found, default locale unchanged`);
    }
  }

  /**
   * Reload all locale files
   * Useful for hot-reloading during development
   */
  public reload(): void {
    this.locales.clear();
    this.loadLocales();
    Logger.info('Locales reloaded');
  }

  /**
   * Get locale for a specific guild
   * @param guildId - Discord guild ID
   * @returns Guild's locale or default locale
   */
  public async getGuildLocale(guildId: string | null): Promise<SupportedLocale> {
    if (!guildId) {
      return this.defaultLocale;
    }

    try {
      const guild = await guildRepository.getGuildById(guildId);
      return guild?.locale || this.defaultLocale;
    } catch (error) {
      Logger.warn(`Failed to get guild locale for ${guildId}, using default`);
      return this.defaultLocale;
    }
  }

  /**
   * Translate with guild locale
   * @param guildId - Discord guild ID (null for DMs)
   * @param path - Translation path
   * @param params - Parameters to replace
   * @returns Translated string
   */
  public async tGuild(guildId: string | null, path: string, params?: Record<string, any>): Promise<string> {
    const locale = await this.getGuildLocale(guildId);
    return this.t(locale, path, params);
  }
}

// Export singleton instance
export const localeService = new LocaleService();

// Helper function for quick translations
export function t(path: string, params?: Record<string, any>, locale: SupportedLocale = 'vi'): string {
  return localeService.t(locale, path, params);
}
