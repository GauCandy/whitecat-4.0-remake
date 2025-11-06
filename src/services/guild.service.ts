/**
 * Guild Service
 * Handles guild/server-related operations and data formatting
 *
 * Benefits:
 * - Centralized guild logic
 * - Consistent data formatting
 * - Easy to extend with new features
 * - Performance optimization with caching
 */

import { Guild, time, TimestampStyles } from 'discord.js';
import { cacheService } from './cache.service';

export class GuildService {
  /**
   * Get formatted guild information
   * Includes caching for performance
   */
  async getGuildInfo(guild: Guild) {
    // Try to get from cache first
    const cacheKey = `guild_info:${guild.id}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    // Build guild info
    const guildInfo = {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      icon: guild.iconURL({ size: 1024 }),
      banner: guild.bannerURL({ size: 1024 }),
      splash: guild.splashURL({ size: 1024 }),
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt,
      createdTimestamp: guild.createdTimestamp,

      // Features
      features: guild.features,
      premiumTier: guild.premiumTier,
      premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,

      // Channels
      channelCount: guild.channels.cache.size,
      textChannels: guild.channels.cache.filter(c => c.isTextBased()).size,
      voiceChannels: guild.channels.cache.filter(c => c.isVoiceBased()).size,

      // Roles
      roleCount: guild.roles.cache.size,

      // Emojis & Stickers
      emojiCount: guild.emojis.cache.size,
      stickerCount: guild.stickers.cache.size,

      // Verification
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
    };

    // Cache for 10 minutes
    await cacheService.set(cacheKey, guildInfo, 600);

    return guildInfo;
  }

  /**
   * Format guild creation date
   */
  formatGuildCreation(guild: Guild): string {
    const timestamp = time(guild.createdAt, TimestampStyles.RelativeTime);
    const date = time(guild.createdAt, TimestampStyles.ShortDate);

    return `${date} (${timestamp})`;
  }

  /**
   * Get guild boost level text
   */
  getBoostLevel(guild: Guild): string {
    const boostLevels: Record<number, string> = {
      0: 'None',
      1: 'Level 1',
      2: 'Level 2',
      3: 'Level 3',
    };

    return boostLevels[guild.premiumTier] || 'Unknown';
  }

  /**
   * Get guild verification level text
   */
  getVerificationLevel(guild: Guild): string {
    const levels: Record<number, string> = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High',
    };

    return levels[guild.verificationLevel] || 'Unknown';
  }

  /**
   * Get guild features as formatted list
   */
  getFormattedFeatures(guild: Guild): string[] {
    const featureMap: Record<string, string> = {
      ANIMATED_ICON: '🎬 Animated Icon',
      BANNER: '🖼️ Banner',
      COMMERCE: '💰 Commerce',
      COMMUNITY: '🌐 Community Server',
      DISCOVERABLE: '🔍 Discoverable',
      FEATURABLE: '⭐ Featurable',
      INVITE_SPLASH: '🌊 Invite Splash',
      MEMBER_VERIFICATION_GATE_ENABLED: '✅ Membership Screening',
      NEWS: '📰 News Channels',
      PARTNERED: '🤝 Partnered',
      PREVIEW_ENABLED: '👁️ Preview Enabled',
      VANITY_URL: '🔗 Vanity URL',
      VERIFIED: '✅ Verified',
      VIP_REGIONS: '🌟 VIP Regions',
      WELCOME_SCREEN_ENABLED: '👋 Welcome Screen',
      TICKETED_EVENTS_ENABLED: '🎫 Ticketed Events',
      MONETIZATION_ENABLED: '💵 Monetization',
      MORE_STICKERS: '😀 More Stickers',
      THREE_DAY_THREAD_ARCHIVE: '📝 3 Day Thread Archive',
      SEVEN_DAY_THREAD_ARCHIVE: '📝 7 Day Thread Archive',
      PRIVATE_THREADS: '🔒 Private Threads',
      ROLE_ICONS: '🎨 Role Icons',
    };

    return guild.features
      .map(feature => featureMap[feature] || feature)
      .sort();
  }

  /**
   * Calculate guild age in days
   */
  getGuildAge(guild: Guild): number {
    return Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get member statistics
   */
  async getMemberStats(guild: Guild) {
    const cacheKey = `guild_member_stats:${guild.id}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch members if not cached
    await guild.members.fetch();

    const stats = {
      total: guild.memberCount,
      humans: guild.members.cache.filter(m => !m.user.bot).size,
      bots: guild.members.cache.filter(m => m.user.bot).size,
      online: guild.members.cache.filter(m => m.presence?.status === 'online').size,
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, 300);

    return stats;
  }

  /**
   * Get role statistics
   */
  getRoleStats(guild: Guild) {
    return {
      total: guild.roles.cache.size,
      hoisted: guild.roles.cache.filter(r => r.hoist).size,
      managed: guild.roles.cache.filter(r => r.managed).size,
      mentionable: guild.roles.cache.filter(r => r.mentionable).size,
    };
  }

  /**
   * Get channel statistics
   */
  getChannelStats(guild: Guild) {
    return {
      total: guild.channels.cache.size,
      text: guild.channels.cache.filter(c => c.isTextBased()).size,
      voice: guild.channels.cache.filter(c => c.isVoiceBased()).size,
      categories: guild.channels.cache.filter(c => c.type === 4).size, // Category type
      announcements: guild.channels.cache.filter(c => c.type === 5).size, // Announcement type
      threads: guild.channels.cache.filter(c => c.isThread()).size,
    };
  }

  /**
   * Check if guild has specific feature
   */
  hasFeature(guild: Guild, feature: string): boolean {
    return guild.features.some(f => f === feature);
  }

  /**
   * Clear guild cache
   */
  async clearGuildCache(guildId: string): Promise<void> {
    await cacheService.delete(`guild_info:${guildId}`);
    await cacheService.delete(`guild_member_stats:${guildId}`);
  }

  /**
   * Get guild boost progress to next level
   */
  getBoostProgress(guild: Guild): { current: number; required: number; remaining: number; level: number } {
    const boostRequirements: Record<number, number> = {
      0: 2,   // Level 0 -> 1: 2 boosts
      1: 7,   // Level 1 -> 2: 7 boosts
      2: 14,  // Level 2 -> 3: 14 boosts
      3: 14,  // Max level
    };

    const currentBoosts = guild.premiumSubscriptionCount || 0;
    const currentLevel = guild.premiumTier;
    const required = boostRequirements[currentLevel];
    const remaining = Math.max(0, required - currentBoosts);

    return {
      current: currentBoosts,
      required,
      remaining,
      level: currentLevel,
    };
  }
}

// Export singleton
export const guildService = new GuildService();
