import dotenv from 'dotenv';

dotenv.config();

interface Config {
  token: string;
  clientId: string;
  guildId: string;
  prefix: string;
  apiPort: number;
}

function validateEnv(): Config {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const prefix = process.env.BOT_PREFIX || '!'; // Default to '!' if not specified
  const apiPort = parseInt(process.env.API_PORT || '3000', 10); // Default to 3000 if not specified

  if (!token) {
    throw new Error('DISCORD_TOKEN is not defined in environment variables');
  }

  if (!clientId) {
    throw new Error('CLIENT_ID is not defined in environment variables');
  }

  if (!guildId) {
    throw new Error('GUILD_ID is not defined in environment variables');
  }

  if (isNaN(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be a valid port number between 1 and 65535');
  }

  return {
    token,
    clientId,
    guildId,
    prefix,
    apiPort,
  };
}

export const config = validateEnv();
