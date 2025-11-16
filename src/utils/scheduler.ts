/**
 * Scheduled Jobs
 * Automated tasks that run periodically
 */

import cron from 'node-cron';
import { pool } from '../database/config';
import logger from '../utils/logger';

/**
 * Cleanup guilds that have been inactive for more than 7 days
 */
async function cleanupInactiveGuilds(): Promise<void> {
    try {
        logger.info('🧹 Running scheduled cleanup of inactive guilds...');

        const result = await pool.query(
            `DELETE FROM guilds
             WHERE left_at IS NOT NULL
             AND left_at < NOW() - INTERVAL '7 days'
             RETURNING guild_id, left_at`,
        );

        if (result.rows.length === 0) {
            logger.info('✅ No inactive guilds to cleanup');
            return;
        }

        logger.info(`🗑️  Deleted ${result.rows.length} inactive guild(s):`);
        result.rows.forEach((row: any) => {
            const leftDaysAgo = Math.floor(
                (Date.now() - new Date(row.left_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            logger.info(`   - Guild ID: ${row.guild_id} (left ${leftDaysAgo} days ago)`);
        });
    } catch (error) {
        logger.error('❌ Error during scheduled guild cleanup:', error);
    }
}

/**
 * Initialize all scheduled jobs
 */
export function initScheduledJobs(): void {
    logger.info('⏰ Initializing scheduled jobs...');

    // Run cleanup every day at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        logger.info('⏰ Running daily cleanup job...');
        await cleanupInactiveGuilds();
    }, {
        timezone: 'Asia/Ho_Chi_Minh' // Vietnam timezone
    });

    logger.info('✅ Scheduled jobs initialized');
    logger.info('   - Guild cleanup: Every day at 3:00 AM (Asia/Ho_Chi_Minh)');
}
