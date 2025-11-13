import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN!;

const rest = new REST({ version: '10' }).setToken(token);

async function clearCommands() {
  try {
    const mode = process.argv[2]; // 'guild' or 'global'

    if (mode === 'guild') {
      if (!guildId) {
        console.error('❌ GUILD_ID not found in .env file');
        process.exit(1);
      }

      console.log('🗑️  Clearing guild commands...');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      console.log('✅ Guild commands cleared successfully!');
    } else if (mode === 'global') {
      console.log('🗑️  Clearing global commands...');
      await rest.put(Routes.applicationCommands(clientId), {
        body: [],
      });
      console.log('✅ Global commands cleared successfully!');
      console.log('⚠️  Note: Global commands may take up to 1 hour to update');
    } else {
      console.log('Usage: npm run clear:guild | npm run clear:global');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error clearing commands:', error);
    process.exit(1);
  }
}

clearCommands();
