import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import type { Command } from '../types/command';

// Load environment variables
config();

const commands: any[] = [];

async function loadCommands() {
  const commandsPath = join(__dirname, '../commands');
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
          const command: Command = commandModule.default || commandModule;

          if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
          }
        } catch (error) {
          console.error(`❌ Error loading command ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read folder ${folder}`);
    }
  }
}

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in .env file');
  }

  const rest = new REST().setToken(token);

  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      // Deploy to specific guild (faster for testing)
      const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      }) as any[];

      console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
    } else {
      // Deploy globally (takes up to 1 hour)
      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      }) as any[];

      console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
      console.log('⏰ Note: Global commands may take up to 1 hour to update.');
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    throw error;
  }
}

async function main() {
  try {
    await loadCommands();
    await deployCommands();
    console.log('\n✅ Command deployment completed!');
  } catch (error) {
    console.error('\n❌ Command deployment failed:', error);
    process.exit(1);
  }
}

main();
