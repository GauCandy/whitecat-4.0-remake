import { readdirSync } from 'fs';
import { join } from 'path';
import { botLogger } from '../utils/logger';
import type { ExtendedClient } from '../types/client';
import type { Event } from '../types/event';

export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = join(__dirname, '../events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);

      try {
        // Dynamic import
        const eventModule = await import(filePath);
        const event: Event = eventModule.default || eventModule;

        if ('name' in event && 'execute' in event) {
          if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
          } else {
            client.on(event.name, (...args) => event.execute(...args));
          }

          botLogger.info(`✅ Loaded event: ${event.name}`);
        } else {
          botLogger.warn(`⚠️  Event ${file} missing required properties`);
        }
      } catch (error) {
        botLogger.error(`❌ Error loading event ${file}:`, error);
      }
    }

    botLogger.info(`📦 Loaded ${eventFiles.length} events total`);
  } catch (error) {
    botLogger.error('❌ Error loading events:', error);
    throw error;
  }
}
