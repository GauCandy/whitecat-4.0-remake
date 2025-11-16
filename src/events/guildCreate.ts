/**
 * Guild Create Event
 * Fired when the bot joins a new server
 * - Adds guild to database
 * - Detects and sets guild locale from Discord
 */

import { Guild } from 'discord.js';
import { Event } from '../types';
import { pool } from '../database/config';
import { mapDiscordLocale } from '../utils/i18n';
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
                     SET owner_id = $1,
                         locale = $2,
                         member_count = $3,
                         icon = $4,
                         is_active = true,
                         left_at = NULL,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE guild_id = $5`,
                    [
                        guild.ownerId,
                        mappedLocale,
                        guild.memberCount,
                        guild.icon,
                        guild.id
                    ]
                );

                logger.info(`Guild ${guild.name} updated in database`);
            } else {
                // Insert new guild into database
                await pool.query(
                    `INSERT INTO guilds (guild_id, owner_id, locale, member_count, icon, prefix)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        guild.id,
                        guild.ownerId,
                        mappedLocale,
                        guild.memberCount,
                        guild.icon,
                        '!' // Default prefix
                    ]
                );

                logger.info(`Guild ${guild.name} added to database with locale: ${mappedLocale}`);
            }

        } catch (error) {
            logger.error('Error in guildCreate event:', error);
        }
    }
};

export default event;
