import type { Event } from '../types/event';
import { botLogger } from '../utils/logger';

const event: Event<'clientReady'> = {
  name: 'clientReady',
  once: true,

  execute(client) {
    botLogger.info(`✅ Bot is ready! Logged in as ${client.user?.tag}`);
    botLogger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
    botLogger.info(`👥 Serving ${client.users.cache.size} users`);

    // Set bot status
    client.user?.setPresence({
      activities: [{ name: '/help | WhiteCat Hosting' }],
      status: 'online',
    });
  },
};

export default event;
