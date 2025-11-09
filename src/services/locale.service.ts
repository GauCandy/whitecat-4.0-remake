/**
 * Locale Service
 * Handles i18n (internationalization) for the bot
 */

import fs from 'fs';
import path from 'path';
import { SupportedLocale, LocaleData } from '../types/locale';
import { guildRepository } from '../database/repositories/guild.repository';
import { config } from '../config';
import Logger from '../utils/logger';

class LocaleService {
  private locales: Map<SupportedLocale, LocaleData> = new Map();
  private defaultLocale: SupportedLocale;

  constructor() {
    this.defaultLocale = config.defaultLocale;
    this.loadLocales();
  }

  /**
   * Load all locale files from the locales directory
   * Supports both single files (vi.json) and directory structure (vi/*.json)
   */
  private loadLocales(): void {
    const localesDir = path.join(__dirname, '..', 'locales');
    const items = fs.readdirSync(localesDir, { withFileTypes: true });

    for (const item of items) {
      let locale: SupportedLocale;
      let localeData: any = {};

      if (item.isFile() && item.name.endsWith('.json')) {
        // Legacy: Single file format (vi.json, en.json)
        locale = item.name.replace('.json', '') as SupportedLocale;
        const filePath = path.join(localesDir, item.name);

        try {
          localeData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LocaleData;
          this.locales.set(locale, localeData);
          Logger.info(`Loaded locale: ${locale} (single file)`);
        } catch (error) {
          Logger.error(`Failed to load locale file ${item.name}`, error);
        }
      } else if (item.isDirectory()) {
        // New: Directory format (vi/*.json, en/*.json)
        locale = item.name as SupportedLocale;
        const localeDir = path.join(localesDir, item.name);
        const jsonFiles = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));

        try {
          // Load and merge all JSON files in the locale directory
          for (const file of jsonFiles) {
            const filePath = path.join(localeDir, file);
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Merge file data into locale data
            localeData = this.deepMerge(localeData, fileData);
          }

          this.locales.set(locale, localeData);
          Logger.info(`Loaded locale: ${locale} (${jsonFiles.length} files)`);
        } catch (error) {
          Logger.error(`Failed to load locale directory ${item.name}`, error);
        }
      }
    }

    if (this.locales.size === 0) {
      Logger.error('No locale files loaded! Bot may not function properly.');
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
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

    // If value is an array, randomly pick one element
    if (Array.isArray(value)) {
      if (value.length === 0) {
        Logger.warn(`Translation array is empty: ${path}`);
        return path;
      }
      value = value[Math.floor(Math.random() * value.length)];
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
export function t(path: string, params?: Record<string, any>, locale?: SupportedLocale): string {
  return localeService.t(locale || config.defaultLocale, path, params);
}
