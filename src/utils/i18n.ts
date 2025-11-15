/**
 * i18n (Internationalization) System
 * Supports multiple languages with fallback to English
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../database/config';

// Supported locales
export enum Locale {
    English = 'en',
    Vietnamese = 'vi',
}

// Translation cache
const translations: Map<Locale, any> = new Map();

/**
 * Load translation file for a specific locale
 */
function loadTranslation(locale: Locale): any {
    if (translations.has(locale)) {
        return translations.get(locale);
    }

    try {
        const translationPath = join(__dirname, `../locales/${locale}.json`);
        const data = readFileSync(translationPath, 'utf-8');
        const translation = JSON.parse(data);
        translations.set(locale, translation);
        return translation;
    } catch (error) {
        console.error(`Failed to load translation for locale: ${locale}`, error);
        // Fallback to English if the locale file doesn't exist
        if (locale !== Locale.English) {
            return loadTranslation(Locale.English);
        }
        return {};
    }
}

/**
 * Get translation value by key path
 * Supports nested keys like "commands.fun.poke.description"
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Translate a key with optional replacements
 * @param locale - The locale to use
 * @param key - Translation key (supports dot notation)
 * @param replacements - Object with placeholders to replace
 * @returns Translated string
 *
 * @example
 * t('en', 'commands.fun.poke.success', { user: '@John' })
 * // Returns: "You poked @John!"
 */
export function t(locale: Locale, key: string, replacements?: Record<string, string>): string {
    const translation = loadTranslation(locale);
    let value = getNestedValue(translation, key);

    // Fallback to English if translation not found
    if (value === undefined && locale !== Locale.English) {
        const fallbackTranslation = loadTranslation(Locale.English);
        value = getNestedValue(fallbackTranslation, key);
    }

    // If still not found, return the key itself
    if (value === undefined) {
        return key;
    }

    // Replace placeholders
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            value = value.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        });
    }

    return value;
}

/**
 * Get guild's preferred locale from database
 * @param guildId - Discord guild ID
 * @returns Guild's locale or default English
 */
export async function getGuildLocale(guildId: string): Promise<Locale> {
    try {
        const result = await pool.query(
            'SELECT locale FROM guilds WHERE guild_id = $1',
            [guildId]
        );

        if (result.rows.length > 0) {
            const locale = result.rows[0].locale as string;
            // Validate locale
            if (Object.values(Locale).includes(locale as Locale)) {
                return locale as Locale;
            }
        }
    } catch (error) {
        console.error('Error fetching guild locale:', error);
    }

    // Default to English
    return Locale.English;
}

/**
 * Set guild's preferred locale
 * @param guildId - Discord guild ID
 * @param locale - Locale to set
 */
export async function setGuildLocale(guildId: string, locale: Locale): Promise<void> {
    try {
        await pool.query(
            'UPDATE guilds SET locale = $1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $2',
            [locale, guildId]
        );
    } catch (error) {
        console.error('Error setting guild locale:', error);
        throw error;
    }
}

/**
 * Map Discord locale codes to our supported locales
 * @param discordLocale - Discord's locale code (e.g., 'vi', 'en-US', 'ja')
 * @returns Supported Locale or default English
 */
export function mapDiscordLocale(discordLocale: string): Locale {
    // Normalize to lowercase and remove region code
    const baseLocale = discordLocale.toLowerCase().split('-')[0];

    switch (baseLocale) {
        case 'vi':
            return Locale.Vietnamese;
        case 'en':
            return Locale.English;
        default:
            // Fallback to English for unsupported locales
            return Locale.English;
    }
}

/**
 * Get translator function for a specific guild
 * Returns a function that automatically uses the guild's locale
 *
 * @example
 * const gt = await getGuildTranslator(guildId);
 * await interaction.reply(gt('commands.ping.response', { ping: '50ms' }));
 */
export async function getGuildTranslator(guildId: string): Promise<(key: string, replacements?: Record<string, string>) => string> {
    const locale = await getGuildLocale(guildId);
    return (key: string, replacements?: Record<string, string>) => t(locale, key, replacements);
}

/**
 * Initialize i18n system
 * Preload all translation files
 */
export function initI18n(): void {
    console.log('🌍 Initializing i18n system...');

    Object.values(Locale).forEach(locale => {
        try {
            loadTranslation(locale);
            console.log(`   ✓ Loaded ${locale} translations`);
        } catch (error) {
            console.error(`   ✗ Failed to load ${locale} translations:`, error);
        }
    });

    console.log('✅ i18n system initialized');
}
