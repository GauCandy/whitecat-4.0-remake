/**
 * Guild Delete Event
 * Fired when the bot leaves a server (kicked or banned)
 * - Marks guild as left (soft delete)
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

            // Mark guild as left (soft delete - keep data for history)
            const result = await pool.query(
                `UPDATE guilds
                 SET left_at = CURRENT_TIMESTAMP
                 WHERE guild_id = $1
                 RETURNING *`,
                [guild.id]
            );

            if (result.rows.length > 0) {
                logger.info(`Guild ${guild.name} marked as left in database`);
            } else {
                logger.warn(`Guild ${guild.name} not found in database`);
            }

        } catch (error) {
            logger.error('Error in guildDelete event:', error);
        }
    }
};

export default event;
