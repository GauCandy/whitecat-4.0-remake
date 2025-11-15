import { readdirSync } from 'fs';
import { join } from 'path';
import { botLogger } from '../utils/logger';
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

            // Check if module exports multiple commands (array)
            if (commandModule.actionCommands && Array.isArray(commandModule.actionCommands)) {
              // Handle action commands array
              for (const command of commandModule.actionCommands) {
                if ('data' in command && 'execute' in command) {
                  client.commands.set(command.data.name, command);
                  botLogger.info(`✅ Loaded command: ${command.data.name} (${folder})`);
                }
              }
            } else if (commandModule.expressionCommands && Array.isArray(commandModule.expressionCommands)) {
              // Handle expression commands array
              for (const command of commandModule.expressionCommands) {
                if ('data' in command && 'execute' in command) {
                  client.commands.set(command.data.name, command);
                  botLogger.info(`✅ Loaded command: ${command.data.name} (${folder})`);
                }
              }
            } else {
              // Handle single command export
              const command: Command = commandModule.default || commandModule;

              if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                botLogger.info(`✅ Loaded command: ${command.data.name} (${folder})`);
              } else {
                botLogger.warn(`⚠️  Command ${file} missing required properties`);
              }
            }
          } catch (error) {
            botLogger.error(`❌ Error loading command ${file}:`, error);
          }
        }
      } catch (error) {
        // Folder might not be accessible or empty
        botLogger.warn(`⚠️  Could not read folder ${folder}:`, error);
      }
    }

    botLogger.info(`📦 Loaded ${client.commands.size} commands total`);
  } catch (error) {
    botLogger.error('❌ Error loading commands:', error);
    throw error;
  }
}
