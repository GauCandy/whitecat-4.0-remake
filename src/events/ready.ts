import type { Event } from '../types/event';
import { botLogger } from '../utils/logger';
import { pool } from '../database/config';
import { mapDiscordLocale } from '../utils/i18n';

/**
 * Sync guilds from Discord to database
 * This ensures all guilds the bot is in are properly registered
 */
async function syncGuilds(client: any) {
  const startTime = Date.now();
  let added = 0;
  let skipped = 0;

  try {
    // Get all guild IDs from Discord
    const discordGuildIds = Array.from(client.guilds.cache.keys());

    if (discordGuildIds.length === 0) {
      return;
    }

    // Fetch all guilds from database in one query
    const dbGuilds = await pool.query(
      'SELECT guild_id FROM guilds WHERE guild_id = ANY($1)',
      [discordGuildIds]
    );

    // Create a Set for quick lookup
    const existingGuildIds = new Set(
      dbGuilds.rows.map(row => row.guild_id)
    );

    // Get default locale from ENV
    const envLocale = process.env.DEFAULT_LOCALE || 'en';
    const defaultLocale = envLocale === 'vi' ? 'vi' : 'en-US';

    // Prepare bulk insert for new guilds only
    const guildsToInsert: any[] = [];

    for (const [guildId, guild] of client.guilds.cache) {
      if (existingGuildIds.has(guildId)) {
        // Guild already in database - skip (preserve original joined_at)
        skipped++;
      } else {
        // Guild not in database - prepare to add
        // Use default locale from ENV (guild sync doesn't change existing settings)
        guildsToInsert.push({
          guildId,
          locale: defaultLocale,
          name: guild.name
        });
        added++;
      }
    }

    // Bulk insert new guilds
    if (guildsToInsert.length > 0) {
      const values = guildsToInsert
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(', ');

      const defaultPrefix = process.env.BOT_PREFIX || '!';
      const params = guildsToInsert.flatMap(g => [g.guildId, g.locale, defaultPrefix]);

      await pool.query(
        `INSERT INTO guilds (guild_id, locale, prefix) VALUES ${values}`,
        params
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (added > 0 || skipped > 0) {
      botLogger.info(`🔄 Guild sync: ${added} added, ${skipped} existing (${duration}s)`);
    }

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

    // Start giveaway manager
    const giveawayManager = (client as any).giveawayManager;
    if (giveawayManager) {
      giveawayManager.start();
    }
  },
};

export default event;
