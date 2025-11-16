import { readdirSync } from 'fs';
import { join } from 'path';
import { botLogger } from '../utils/logger';
import type { ExtendedClient } from '../types/client';
import type { TextCommand } from '../types/textCommand';

/**
 * Load all text/prefix commands from textCommands directory
 */
export async function loadTextCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, '../textCommands');
  let totalCommands = 0;
  let totalAliases = 0;

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
            const commandModule = await import(filePath);
            const command: TextCommand = commandModule.default || commandModule;

            if ('name' in command && 'execute' in command) {
              // Set main command name
              client.textCommands.set(command.name, command);
              totalCommands++;

              // Set aliases
              if (command.aliases && command.aliases.length > 0) {
                for (const alias of command.aliases) {
                  client.textCommands.set(alias, command);
                }
                totalAliases += command.aliases.length;
              }
            } else {
              botLogger.warn(`⚠️  Text command ${file} missing required properties`);
            }
          } catch (error) {
            botLogger.error(`❌ Error loading text command ${file}:`, error);
          }
        }
      } catch (error) {
        botLogger.warn(`⚠️  Could not read folder ${folder}:`, error);
      }
    }

    if (totalCommands > 0) {
      const aliasInfo = totalAliases > 0 ? ` + ${totalAliases} aliases` : '';
      botLogger.info(`📦 Loaded ${totalCommands} text commands${aliasInfo}`);
    }
  } catch (error) {
    botLogger.error('❌ Error loading text commands:', error);
    // Don't throw - text commands are optional
  }
}
