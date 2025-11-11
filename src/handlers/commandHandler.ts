import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import type { ExtendedClient } from '../types/client';
import type { Command } from '../types/command';

export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, '../commands');

  try {
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);

      try {
        const commandFiles = readdirSync(folderPath).filter(
          (file) => file.endsWith('.ts') || file.endsWith('.js')
        );

        for (const file of commandFiles) {
          const filePath = join(folderPath, file);

          try {
            // Dynamic import
            const commandModule = await import(filePath);
            const command: Command = commandModule.default || commandModule;

            if ('data' in command && 'execute' in command) {
              client.commands.set(command.data.name, command);
              logger.info(`✅ Loaded command: ${command.data.name} (${folder})`);
            } else {
              logger.warn(`⚠️  Command ${file} missing required properties`);
            }
          } catch (error) {
            logger.error(`❌ Error loading command ${file}:`, error);
          }
        }
      } catch (error) {
        // Folder might not be accessible or empty
        logger.warn(`⚠️  Could not read folder ${folder}:`, error);
      }
    }

    logger.info(`📦 Loaded ${client.commands.size} commands total`);
  } catch (error) {
    logger.error('❌ Error loading commands:', error);
    throw error;
  }
}
