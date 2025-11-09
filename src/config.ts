import dotenv from 'dotenv';
import { SupportedLocale } from './types/locale';

dotenv.config();

interface Config {
  token: string;
  clientId: string;
  clientSecret: string;
  botOwnerId: string;
  redirectUri: string;
  guildId: string;
  prefix: string;
  apiPort: number;
  defaultLocale: SupportedLocale;
}

function validateEnv(): Config {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const botOwnerId = process.env.BOT_OWNER_ID;
  const redirectUri = process.env.REDIRECT_URI;
  const guildId = process.env.GUILD_ID;
  const prefix = process.env.BOT_PREFIX || '!'; // Default to '!' if not specified
  const apiPort = parseInt(process.env.API_PORT || '3000', 10); // Default to 3000 if not specified
  const defaultLocale = (process.env.DEFAULT_LOCALE || 'en') as SupportedLocale; // Default to 'en' if not specified

  if (!token) {
    throw new Error('DISCORD_TOKEN is not defined in environment variables');
  }

  if (!clientId) {
    throw new Error('CLIENT_ID is not defined in environment variables');
  }

  if (!clientSecret) {
    throw new Error('CLIENT_SECRET is not defined in environment variables');
  }

  if (!botOwnerId) {
    throw new Error('BOT_OWNER_ID is not defined in environment variables');
  }

  if (!redirectUri) {
    throw new Error('REDIRECT_URI is not defined in environment variables');
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
    clientSecret,
    botOwnerId,
    redirectUri,
    guildId,
    prefix,
    apiPort,
    defaultLocale,
  };
}

export const config = validateEnv();
