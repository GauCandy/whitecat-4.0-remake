import { REST, Routes } from 'discord.js';
import { config } from './config';
import fs from 'fs';
import path from 'path';

const commands = [];

/**
 * Recursively scan directory for command files
 * @param dir - Directory to scan
 * @returns Array of command file paths
 */
function getCommandFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...getCommandFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
      // Add command files
      files.push(fullPath);
    }
  }

  return files;
}

// Load all command files from commands directory and subdirectories
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getCommandFiles(commandsPath);

// Get the JSON representation of each command
for (const filePath of commandFiles) {
  const command = require(filePath).default;

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`[INFO] Loaded command: ${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// Get guild ID from command line argument (if provided)
// Usage: npm run deploy              -> Global deploy
//        npm run deploy <guild_id>   -> Guild deploy
const guildId = process.argv[2];

// Deploy commands
(async () => {
  try {
    console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

    let data: any[];

    if (guildId) {
      // Deploy to specific guild (instant update)
      console.log(`[INFO] Deploying to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, guildId),
        { body: commands },
      ) as any[];
      console.log(`[SUCCESS] Successfully deployed ${data.length} guild commands to ${guildId}`);
    } else {
      // Deploy globally (takes ~1 hour to propagate)
      console.log('[INFO] Deploying globally (this may take up to 1 hour to propagate)...');
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      ) as any[];
      console.log(`[SUCCESS] Successfully deployed ${data.length} global commands`);
    }

  } catch (error) {
    console.error('[ERROR] Failed to deploy commands:', error);
  }
})();
