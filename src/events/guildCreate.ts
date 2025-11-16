/**
 * Guild Create Event
 * Fired when the bot joins a new server
 * - Adds guild to database
 * - Detects and sets guild locale from Discord
 * - Logs who invited the bot
 */

import { Guild, AuditLogEvent } from 'discord.js';
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

            // Try to get who invited the bot (requires ViewAuditLog permission)
            let invitedBy: string | null = null;
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    limit: 10,
                    type: AuditLogEvent.BotAdd,
                });

                const botAddLog = auditLogs.entries.find(
                    entry => entry.target?.id === guild.client.user.id
                );

                if (botAddLog) {
                    invitedBy = botAddLog.executor?.id || null;
                    logger.info(`Bot was invited by: ${botAddLog.executor?.tag} (${invitedBy})`);
                }
            } catch (error) {
                logger.warn(`Could not fetch audit logs for ${guild.name} - missing permissions?`);
            }

            // Check if guild already exists in database
            const existingGuild = await pool.query(
                'SELECT guild_id FROM guilds WHERE guild_id = $1',
                [guild.id]
            );

            if (existingGuild.rows.length > 0) {
                logger.warn(`Guild ${guild.name} already exists in database. Updating...`);

                // Update existing guild - reset left_at and update locale
                await pool.query(
                    `UPDATE guilds
                     SET locale = $1,
                         left_at = NULL
                     WHERE guild_id = $2`,
                    [mappedLocale, guild.id]
                );

                logger.info(`Guild ${guild.name} updated in database`);
            } else {
                // Insert new guild into database
                await pool.query(
                    `INSERT INTO guilds (guild_id, locale, prefix)
                     VALUES ($1, $2, $3)`,
                    [guild.id, mappedLocale, '!']
                );

                logger.info(`Guild ${guild.name} added to database with locale: ${mappedLocale}`);
            }

        } catch (error) {
            logger.error('Error in guildCreate event:', error);
        }
    }
};

export default event;
