import type { Event } from '../types/event';
import { botLogger } from '../utils/logger';
import { pool } from '../database/config';
import { mapDiscordLocale } from '../utils/i18n';

/**
 * Sync guilds from Discord to database
 * This ensures all guilds the bot is in are properly registered
 */
async function syncGuilds(client: any) {
  botLogger.info('🔄 Syncing guilds to database...');

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      // Detect locale
      const discordLocale = guild.preferredLocale;
      const mappedLocale = mapDiscordLocale(discordLocale);

      // Check if guild exists in database
      const result = await pool.query(
        'SELECT guild_id, left_at FROM guilds WHERE guild_id = $1',
        [guildId]
      );

      if (result.rows.length === 0) {
        // Guild not in database - add it
        await pool.query(
          `INSERT INTO guilds (guild_id, locale, prefix)
           VALUES ($1, $2, $3)`,
          [guildId, mappedLocale, '!']
        );
        added++;
        botLogger.info(`➕ Added guild: ${guild.name} (${guildId})`);
      } else if (result.rows[0].left_at) {
        // Guild was marked as left - rejoin
        await pool.query(
          `UPDATE guilds
           SET locale = $1, left_at = NULL
           WHERE guild_id = $2`,
          [mappedLocale, guildId]
        );
        updated++;
        botLogger.info(`🔄 Updated guild: ${guild.name} (${guildId})`);
      } else {
        // Guild already in database and active
        skipped++;
      }
    } catch (error) {
      botLogger.error(`❌ Failed to sync guild ${guildId}:`, error);
    }
  }

  botLogger.info(`✅ Guild sync complete: ${added} added, ${updated} updated, ${skipped} skipped`);
}

const event: Event<'clientReady'> = {
  name: 'clientReady',
  once: true,

  async execute(client) {
    botLogger.info(`✅ Bot is ready! Logged in as ${client.user?.tag}`);
    botLogger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
    botLogger.info(`👥 Serving ${client.users.cache.size} users`);

    // Set bot status
    client.user?.setPresence({
      activities: [{ name: '/help | WhiteCat Hosting' }],
      status: 'online',
    });

    // Sync guilds to database (after bot is ready)
    await syncGuilds(client);
  },
};

export default event;
