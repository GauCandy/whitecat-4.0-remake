import { REST, Routes } from 'discord.js';
import { config } from './config';
import fs from 'fs';
import path from 'path';

const commands = [];

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

// Get the JSON representation of each command
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
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

// Deploy commands
(async () => {
  try {
    console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

    // Deploy to a specific guild for testing (faster updates)
    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    ) as any[];

    console.log(`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`);

    // If you want to deploy globally (takes up to 1 hour to update), use this instead:
    // const data = await rest.put(
    //   Routes.applicationCommands(config.clientId),
    //   { body: commands },
    // ) as any[];

  } catch (error) {
    console.error('[ERROR] Failed to deploy commands:', error);
  }
})();
