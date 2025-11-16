/**
 * i18n (Internationalization) System
 * Supports multiple languages with fallback to English
 * Auto-discovers supported locales from locales folder
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from '../database/config';
import { SlashCommandBuilder } from 'discord.js';

// Supported locales
export enum Locale {
    EnglishUS = 'en-US',
    Vietnamese = 'vi',
}

// Translation cache
const translations: Map<string, any> = new Map();

// Supported locales discovered from files
let supportedLocales: string[] = [];

/**
 * Discover all supported locales from the locales directory
 * Scans for .json files and extracts locale codes
 */
function discoverSupportedLocales(): string[] {
    try {
        const localesPath = join(__dirname, '../locales');
        const files = readdirSync(localesPath).filter(file => file.endsWith('.json'));
        return files.map(file => file.replace('.json', ''));
    } catch (error) {
        console.error('Error discovering supported locales:', error);
        return ['en-US']; // Fallback to English US
    }
}

/**
 * Get all supported locales
 * Returns the list of discovered locale codes
 */
export function getSupportedLocales(): string[] {
    if (supportedLocales.length === 0) {
        supportedLocales = discoverSupportedLocales();
    }
    return supportedLocales;
}

/**
 * Load translation file for a specific locale
 */
function loadTranslation(locale: string): any {
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
        // Fallback to English US if the locale file doesn't exist
        if (locale !== Locale.EnglishUS) {
            return loadTranslation(Locale.EnglishUS);
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
 * @param locale - The locale to use (can be Locale enum or string)
 * @param key - Translation key (supports dot notation)
 * @param replacements - Object with placeholders to replace
 * @returns Translated string
 *
 * @example
 * t('en-US', 'commands.fun.poke.success', { user: '@John' })
 * // Returns: "You poked @John!"
 */
export function t(locale: Locale | string, key: string, replacements?: Record<string, string>): string {
    const translation = loadTranslation(locale);
    let value = getNestedValue(translation, key);

    // Fallback to English if translation not found
    if (value === undefined && locale !== Locale.EnglishUS) {
        const fallbackTranslation = loadTranslation(Locale.EnglishUS);
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

    // Default to English US
    return Locale.EnglishUS;
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
    // Normalize to lowercase
    const normalizedLocale = discordLocale.toLowerCase();

    switch (normalizedLocale) {
        case 'vi':
            return Locale.Vietnamese;
        case 'en-us':
        case 'en-gb':
        case 'en':
            return Locale.EnglishUS;
        default:
            // Fallback to English US for unsupported locales
            return Locale.EnglishUS;
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
 * Get localized descriptions for all supported locales
 * Used for Discord slash command description localizations
 *
 * @param key - Translation key for description
 * @returns Object with locale codes as keys and translated descriptions as values
 *
 * @example
 * .setDescriptionLocalizations(getLocalizations('commands.fun.hug.description'))
 * // Returns: { vi: 'Ôm ai đó' }
 */
export function getLocalizations(key: string): Record<string, string> {
    const localizations: Record<string, string> = {};

    // Auto-discover and iterate through all supported locales
    const locales = getSupportedLocales();
    locales.forEach(locale => {
        // Skip English US since it's the default
        if (locale === Locale.EnglishUS) {
            return;
        }

        const translation = t(locale, key);
        // Only add if translation exists and is not the key itself (fallback)
        if (translation && translation !== key) {
            localizations[locale] = translation;
        }
    });

    return localizations;
}

/**
 * Build a localized slash command with automatic description localizations
 * Automatically looks up descriptions from i18n based on command name and category
 *
 * @param name - Command name (e.g., 'hug', 'kiss')
 * @param category - Command category (e.g., 'fun', 'utility')
 * @returns SlashCommandBuilder with name and localized descriptions set
 *
 * @example
 * const command: Command = {
 *     data: buildLocalizedCommand('hug', 'fun')
 *         .addUserOption(option => ...)
 * };
 */
export function buildLocalizedCommand(name: string, category: string): SlashCommandBuilder {
    const descriptionKey = `commands.${category}.${name}.description`;

    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(t(Locale.EnglishUS, descriptionKey))
        .setDescriptionLocalizations(getLocalizations(descriptionKey));
}

/**
 * Initialize i18n system
 * Auto-discovers and preloads all translation files from locales folder
 */
export function initI18n(): void {
    // Discover all locales from files
    const locales = getSupportedLocales();

    // Preload all discovered locales
    let loaded = 0;
    locales.forEach(locale => {
        try {
            loadTranslation(locale);
            loaded++;
        } catch (error) {
            console.error(`Failed to load ${locale} translations:`, error);
        }
    });

    console.log(`🌍 i18n initialized: ${loaded} language(s) (${locales.join(', ')})`);
}
