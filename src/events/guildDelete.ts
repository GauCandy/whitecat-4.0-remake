/**
 * Guild Delete Event
 * Fired when the bot leaves a server (kicked or banned)
 * - Optionally removes guild from database (or marks as inactive)
 * - Logs statistics
 */

import { Guild } from 'discord.js';
import { Event } from '../types';
import { pool } from '../database/config';
import logger from '../utils/logger';

const event: Event<'guildDelete'> = {
    name: 'guildDelete',
    once: false,
    async execute(guild: Guild) {
        try {
            logger.info(`Bot left guild: ${guild.name} (${guild.id})`);

            // Option 1: Soft delete - Keep data but mark as inactive
            // You can add an 'is_active' column to guilds table if you want to keep historical data

            // Option 2: Hard delete - Remove all guild data
            // This is the approach we'll use for now

            // Delete guild from database (cascade will handle related data)
            const result = await pool.query(
                'DELETE FROM guilds WHERE guild_id = $1 RETURNING *',
                [guild.id]
            );

            if (result.rows.length > 0) {
                logger.info(`Guild ${guild.name} removed from database`);
            } else {
                logger.warn(`Guild ${guild.name} not found in database`);
            }

            // Log statistics
            await logGuildLeave(guild);

        } catch (error) {
            logger.error('Error in guildDelete event:', error);
        }
    }
};

/**
 * Log guild leave to statistics
 */
async function logGuildLeave(guild: Guild): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO statistics (stat_type, stat_value, date)
             VALUES ('servers_left', 1, CURRENT_DATE)
             ON CONFLICT (stat_type, date)
             DO UPDATE SET stat_value = statistics.stat_value + 1`
        );

        logger.info(`Guild leave logged to statistics: ${guild.name}`);
    } catch (error) {
        logger.error('Error logging guild leave to statistics:', error);
    }
}

export default event;
