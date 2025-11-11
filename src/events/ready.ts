import type { Event } from '../types/event';
import { logger } from '../utils/logger';

const event: Event<'ready'> = {
  name: 'ready',
  once: true,

  execute(client) {
    logger.info(`✅ Bot is ready! Logged in as ${client.user?.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
    logger.info(`👥 Serving ${client.users.cache.size} users`);

    // Set bot status
    client.user?.setPresence({
      activities: [{ name: '/help | WhiteCat Hosting' }],
      status: 'online',
    });
  },
};

export default event;
