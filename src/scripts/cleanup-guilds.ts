/**
 * Cleanup Inactive Guilds Script
 * Removes guilds that kicked the bot more than 7 days ago
 */

import { pool } from '../database/config';
import logger from '../utils/logger';

/**
 * Delete guilds that have been inactive for more than 7 days
 * @param daysInactive - Number of days of inactivity before deletion (default: 7)
 */
async function cleanupInactiveGuilds(daysInactive: number = 7): Promise<void> {
    try {
        logger.info(`🧹 Starting cleanup of guilds inactive for more than ${daysInactive} days...`);

        // Find guilds that left more than X days ago
        const result = await pool.query(
            `DELETE FROM guilds
             WHERE left_at IS NOT NULL
             AND left_at < NOW() - INTERVAL '${daysInactive} days'
             RETURNING guild_id, left_at`,
        );

        if (result.rows.length === 0) {
            logger.info('✅ No inactive guilds found. Database is clean!');
            return;
        }

        logger.info(`🗑️  Deleted ${result.rows.length} inactive guild(s):`);
        result.rows.forEach((row: any) => {
            const leftDaysAgo = Math.floor(
                (Date.now() - new Date(row.left_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            logger.info(`   - Guild ID: ${row.guild_id} (left ${leftDaysAgo} days ago)`);
        });

        logger.info('✅ Cleanup completed successfully!');
    } catch (error) {
        logger.error('❌ Error during guild cleanup:', error);
        throw error;
    }
}

/**
 * Get statistics about inactive guilds
 */
async function getInactiveGuildsStats(daysInactive: number = 7): Promise<void> {
    try {
        logger.info(`📊 Checking guilds inactive for more than ${daysInactive} days...`);

        const result = await pool.query(
            `SELECT guild_id, left_at,
                    EXTRACT(DAY FROM (NOW() - left_at)) as days_inactive
             FROM guilds
             WHERE left_at IS NOT NULL
             AND left_at < NOW() - INTERVAL '${daysInactive} days'
             ORDER BY left_at ASC`,
        );

        if (result.rows.length === 0) {
            logger.info('✅ No inactive guilds found!');
            return;
        }

        logger.info(`⚠️  Found ${result.rows.length} inactive guild(s):`);
        result.rows.forEach((row: any) => {
            logger.info(`   - Guild ID: ${row.guild_id} (inactive for ${Math.floor(row.days_inactive)} days)`);
        });

        logger.info(`\n💡 Run with --cleanup to delete these guilds`);
    } catch (error) {
        logger.error('❌ Error getting inactive guilds stats:', error);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const cleanupFlag = args.includes('--cleanup');
    const daysArg = args.find(arg => arg.startsWith('--days='));
    const daysInactive = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

    try {
        if (cleanupFlag) {
            await cleanupInactiveGuilds(daysInactive);
        } else {
            await getInactiveGuildsStats(daysInactive);
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        logger.error('Fatal error:', error);
        await pool.end();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { cleanupInactiveGuilds, getInactiveGuildsStats };
