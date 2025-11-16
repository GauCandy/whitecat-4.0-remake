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

  const startTime = Date.now();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Get all guild IDs from Discord
    const discordGuildIds = Array.from(client.guilds.cache.keys());

    if (discordGuildIds.length === 0) {
      botLogger.info('✅ No guilds to sync');
      return;
    }

    // Fetch all guilds from database in one query
    const dbGuilds = await pool.query(
      'SELECT guild_id, left_at FROM guilds WHERE guild_id = ANY($1)',
      [discordGuildIds]
    );

    // Create a map for quick lookup
    const dbGuildMap = new Map(
      dbGuilds.rows.map(row => [row.guild_id, row])
    );

    // Prepare bulk operations
    const guildsToInsert: any[] = [];
    const guildsToUpdate: any[] = [];

    for (const [guildId, guild] of client.guilds.cache) {
      const discordLocale = guild.preferredLocale;
      const mappedLocale = mapDiscordLocale(discordLocale);

      const dbGuild = dbGuildMap.get(guildId);

      if (!dbGuild) {
        // Guild not in database - prepare to add
        guildsToInsert.push({
          guildId,
          locale: mappedLocale,
          name: guild.name
        });
        added++;
      } else if (dbGuild.left_at) {
        // Guild was marked as left - prepare to update
        guildsToUpdate.push({
          guildId,
          locale: mappedLocale,
          name: guild.name
        });
        updated++;
      } else {
        // Guild already active
        skipped++;
      }
    }

    // Bulk insert new guilds
    if (guildsToInsert.length > 0) {
      const values = guildsToInsert
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(', ');

      const params = guildsToInsert.flatMap(g => [g.guildId, g.locale, '!']);

      await pool.query(
        `INSERT INTO guilds (guild_id, locale, prefix) VALUES ${values}`,
        params
      );

      botLogger.info(`➕ Inserted ${guildsToInsert.length} new guilds`);
    }

    // Bulk update rejoined guilds
    if (guildsToUpdate.length > 0) {
      // Use UPDATE with CASE for bulk update
      const guildIds = guildsToUpdate.map(g => g.guildId);
      const locales = guildsToUpdate.map(g => g.locale);

      await pool.query(
        `UPDATE guilds
         SET locale = data.locale,
             left_at = NULL
         FROM (
           SELECT unnest($1::text[]) AS guild_id,
                  unnest($2::text[]) AS locale
         ) AS data
         WHERE guilds.guild_id = data.guild_id`,
        [guildIds, locales]
      );

      botLogger.info(`🔄 Updated ${guildsToUpdate.length} rejoined guilds`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    botLogger.info(
      `✅ Guild sync complete in ${duration}s: ${added} added, ${updated} updated, ${skipped} skipped`
    );

  } catch (error) {
    botLogger.error('❌ Failed to sync guilds:', error);
  }
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
