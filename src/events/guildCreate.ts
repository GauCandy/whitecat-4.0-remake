/**
 * Guild Create Event
 * Fired when the bot joins a new server
 * - Adds guild to database
 * - Detects and sets guild locale from Discord
 * - Sends welcome message
 */

import { Guild, EmbedBuilder, TextChannel } from 'discord.js';
import { Event } from '../types';
import { pool } from '../database/config';
import { mapDiscordLocale, t, Locale } from '../utils/i18n';
import logger from '../utils/logger';

const event: Event<'guildCreate'> = {
    name: 'guildCreate',
    once: false,
    async execute(guild: Guild) {
        try {
            logger.info(`Bot joined new guild: ${guild.name} (${guild.id})`);

            // Detect guild's preferred locale from Discord
            const discordLocale = guild.preferredLocale; // Discord API returns locale like "vi", "en-US"
            const mappedLocale = mapDiscordLocale(discordLocale);

            logger.info(`Guild ${guild.name} locale detected: ${discordLocale} -> ${mappedLocale}`);

            // Check if guild already exists in database
            const existingGuild = await pool.query(
                'SELECT guild_id FROM guilds WHERE guild_id = $1',
                [guild.id]
            );

            if (existingGuild.rows.length > 0) {
                logger.warn(`Guild ${guild.name} already exists in database. Updating...`);

                // Update existing guild
                await pool.query(
                    `UPDATE guilds
                     SET guild_name = $1,
                         owner_id = $2,
                         locale = $3,
                         member_count = $4,
                         icon = $5,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE guild_id = $6`,
                    [
                        guild.name,
                        guild.ownerId,
                        mappedLocale,
                        guild.memberCount,
                        guild.icon,
                        guild.id
                    ]
                );
            } else {
                // Insert new guild into database
                await pool.query(
                    `INSERT INTO guilds (guild_id, guild_name, owner_id, locale, member_count, icon, prefix)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        guild.id,
                        guild.name,
                        guild.ownerId,
                        mappedLocale,
                        guild.memberCount,
                        guild.icon,
                        '!' // Default prefix
                    ]
                );

                logger.info(`Guild ${guild.name} added to database with locale: ${mappedLocale}`);
            }

            // Send welcome message to the first available text channel
            await sendWelcomeMessage(guild, mappedLocale);

            // Log statistics
            await logGuildJoin(guild);

        } catch (error) {
            logger.error('Error in guildCreate event:', error);
        }
    }
};

/**
 * Send welcome message to guild's system channel or first available text channel
 */
async function sendWelcomeMessage(guild: Guild, locale: Locale): Promise<void> {
    try {
        // Try to find a suitable channel to send the welcome message
        let channel: TextChannel | null = null;

        // 1. Try system channel (where Discord sends join messages)
        if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me!)?.has(['SendMessages', 'EmbedLinks'])) {
            channel = guild.systemChannel;
        }

        // 2. Try to find a channel named "general", "chat", "welcome", etc.
        if (!channel) {
            const channelNames = ['general', 'chat', 'welcome', 'lobby', 'main'];
            const foundChannel = guild.channels.cache.find(ch =>
                ch.isTextBased() &&
                channelNames.some(name => ch.name.toLowerCase().includes(name)) &&
                (ch as TextChannel).permissionsFor(guild.members.me!)?.has(['SendMessages', 'EmbedLinks'])
            ) as TextChannel;

            if (foundChannel) {
                channel = foundChannel;
            }
        }

        // 3. Fall back to the first text channel we can send messages to
        if (!channel) {
            const firstChannel = guild.channels.cache.find(ch =>
                ch.isTextBased() &&
                (ch as TextChannel).permissionsFor(guild.members.me!)?.has(['SendMessages', 'EmbedLinks'])
            ) as TextChannel;

            if (firstChannel) {
                channel = firstChannel;
            }
        }

        // If we still can't find a channel, give up
        if (!channel) {
            logger.warn(`Could not find a suitable channel to send welcome message in guild: ${guild.name}`);
            return;
        }

        // Get localized strings
        const localeNames: Record<Locale, string> = {
            [Locale.EnglishUS]: 'English (US)',
            [Locale.Vietnamese]: 'Tiếng Việt'
        };

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FFB300') // WhiteCat yellow
            .setTitle(t(locale, 'events.guildCreate.welcome_title'))
            .setDescription(t(locale, 'events.guildCreate.welcome_description'))
            .setThumbnail(guild.members.me?.displayAvatarURL() || null)
            .setFooter({
                text: t(locale, 'events.guildCreate.locale_detected', { locale: localeNames[locale] })
            })
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
        logger.info(`Welcome message sent to ${guild.name} in channel: ${channel.name}`);

    } catch (error) {
        logger.error('Error sending welcome message:', error);
    }
}

/**
 * Log guild join to statistics
 */
async function logGuildJoin(guild: Guild): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO statistics (stat_type, stat_value, date)
             VALUES ('servers_joined', 1, CURRENT_DATE)
             ON CONFLICT (stat_type, date)
             DO UPDATE SET stat_value = statistics.stat_value + 1`
        );

        logger.info(`Guild join logged to statistics: ${guild.name}`);
    } catch (error) {
        logger.error('Error logging guild join to statistics:', error);
    }
}

export default event;
