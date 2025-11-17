/**
 * Discord Utility Functions
 * Handles Discord-related operations using REST API
 */

import { REST, Routes, ChannelType } from 'discord.js';
import { webLogger } from './logger';

// Cache for server invite links (to avoid rate limits)
const inviteCache = new Map<string, { invite: string; expires: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Generate a Discord server invite link using REST API
 * @param guildId - The Discord guild (server) ID
 * @param botToken - The bot token for authentication
 * @returns Promise<string> - The generated invite URL
 */
export async function generateServerInvite(guildId: string, botToken: string): Promise<string> {
  try {
    // Check cache first
    const cached = inviteCache.get(guildId);
    if (cached && cached.expires > Date.now()) {
      webLogger.info(`Using cached invite for guild ${guildId}`);
      return cached.invite;
    }

    const rest = new REST().setToken(botToken);

    // Fetch all channels in the guild
    const channels = await rest.get(Routes.guildChannels(guildId)) as any[];

    if (!channels || channels.length === 0) {
      throw new Error('No channels found in the guild');
    }

    // Find a suitable channel to create invite for
    // Priority: System channel > First text channel > Any channel
    let targetChannel = channels.find((ch: any) => ch.type === ChannelType.GuildText);

    if (!targetChannel) {
      // If no text channel, try any channel that allows invites
      targetChannel = channels[0];
    }

    if (!targetChannel) {
      throw new Error('Could not find a suitable channel to create invite');
    }

    webLogger.info(`Creating invite for channel ${targetChannel.id} in guild ${guildId}`);

    // Create an invite for the channel
    // max_age: 0 = never expires
    // max_uses: 0 = unlimited uses
    const invite = await rest.post(Routes.channelInvites(targetChannel.id), {
      body: {
        max_age: 0,
        max_uses: 0,
        unique: false,
      },
    }) as any;

    const inviteUrl = `https://discord.gg/${invite.code}`;

    // Cache the invite
    inviteCache.set(guildId, {
      invite: inviteUrl,
      expires: Date.now() + CACHE_DURATION,
    });

    webLogger.info(`Generated invite: ${inviteUrl}`);
    return inviteUrl;
  } catch (error) {
    webLogger.error('Failed to generate Discord server invite:', error);

    // Return a fallback message if invite generation fails
    throw new Error('Failed to generate server invite. Please contact the bot owner.');
  }
}

/**
 * Clear the invite cache for a specific guild or all guilds
 * @param guildId - Optional guild ID to clear specific cache
 */
export function clearInviteCache(guildId?: string): void {
  if (guildId) {
    inviteCache.delete(guildId);
    webLogger.info(`Cleared invite cache for guild ${guildId}`);
  } else {
    inviteCache.clear();
    webLogger.info('Cleared all invite cache');
  }
}
