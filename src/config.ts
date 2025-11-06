import dotenv from 'dotenv';

dotenv.config();

interface Config {
  token: string;
  clientId: string;
  guildId: string;
  prefix: string;
}

function validateEnv(): Config {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const prefix = process.env.BOT_PREFIX || '!'; // Default to '!' if not specified

  if (!token) {
    throw new Error('DISCORD_TOKEN is not defined in environment variables');
  }

  if (!clientId) {
    throw new Error('CLIENT_ID is not defined in environment variables');
  }

  if (!guildId) {
    throw new Error('GUILD_ID is not defined in environment variables');
  }

  return {
    token,
    clientId,
    guildId,
    prefix,
  };
}

export const config = validateEnv();
