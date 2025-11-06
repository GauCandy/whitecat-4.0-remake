/**
 * User Service
 * Handles user-related operations and data formatting
 *
 * Benefits:
 * - Avoid code duplication across commands
 * - Centralized business logic
 * - Easy to test and maintain
 * - Consistent data formatting
 */

import { User, GuildMember, time, TimestampStyles } from 'discord.js';
import { cacheService } from './cache.service';

export class UserService {
  /**
   * Get formatted user information
   * Includes caching for performance
   */
  async getUserInfo(user: User, member?: GuildMember) {
    // Try to get from cache first
    const cacheKey = `user_info:${user.id}`;
    const cached = await cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    // Build user info
    const userInfo = {
      id: user.id,
      tag: user.tag,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.displayAvatarURL({ size: 1024 }),
      bot: user.bot,
      createdAt: user.createdAt,
      createdTimestamp: user.createdTimestamp,

      // Member-specific info (if in guild)
      ...(member && {
        nickname: member.nickname,
        joinedAt: member.joinedAt,
        joinedTimestamp: member.joinedTimestamp,
        roles: member.roles.cache.map(r => r.id),
        permissions: member.permissions.toArray(),
        color: member.displayHexColor,
      }),
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, userInfo, 300);

    return userInfo;
  }

  /**
   * Format user creation date
   */
  formatUserCreation(user: User): string {
    const timestamp = time(user.createdAt, TimestampStyles.RelativeTime);
    const date = time(user.createdAt, TimestampStyles.ShortDate);

    return `${date} (${timestamp})`;
  }

  /**
   * Format member join date
   */
  formatMemberJoin(member: GuildMember): string {
    if (!member.joinedAt) return 'Unknown';

    const timestamp = time(member.joinedAt, TimestampStyles.RelativeTime);
    const date = time(member.joinedAt, TimestampStyles.ShortDate);

    return `${date} (${timestamp})`;
  }

  /**
   * Get user badges/flags
   */
  getUserBadges(user: User): string[] {
    const flags = user.flags?.toArray() || [];
    const badges: string[] = [];

    // Map flags to emoji badges
    const flagMap: Record<string, string> = {
      Staff: '🛡️ Discord Staff',
      Partner: '🤝 Partnered Server Owner',
      Hypesquad: '🎉 HypeSquad Events',
      BugHunterLevel1: '🐛 Bug Hunter Level 1',
      BugHunterLevel2: '🐛 Bug Hunter Level 2',
      HypeSquadOnlineHouse1: '💜 HypeSquad Bravery',
      HypeSquadOnlineHouse2: '❤️ HypeSquad Brilliance',
      HypeSquadOnlineHouse3: '💚 HypeSquad Balance',
      PremiumEarlySupporter: '⭐ Early Supporter',
      VerifiedBot: '✅ Verified Bot',
      VerifiedDeveloper: '🔧 Early Verified Bot Developer',
      CertifiedModerator: '👮 Certified Moderator',
      ActiveDeveloper: '💻 Active Developer',
    };

    for (const flag of flags) {
      if (flagMap[flag]) {
        badges.push(flagMap[flag]);
      }
    }

    return badges;
  }

  /**
   * Calculate user account age in days
   */
  getUserAge(user: User): number {
    return Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate member server age in days
   */
  getMemberAge(member: GuildMember): number {
    if (!member.joinedTimestamp) return 0;
    return Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user is a moderator
   */
  isModerator(member: GuildMember): boolean {
    return member.permissions.has(['KickMembers', 'BanMembers', 'ManageMessages']);
  }

  /**
   * Check if user is an administrator
   */
  isAdmin(member: GuildMember): boolean {
    return member.permissions.has('Administrator');
  }

  /**
   * Get top roles for member (excluding @everyone)
   */
  getTopRoles(member: GuildMember, limit: number = 5): string[] {
    return member.roles.cache
      .filter(role => role.id !== member.guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .first(limit)
      .map(role => role.name);
  }

  /**
   * Clear user cache
   */
  async clearUserCache(userId: string): Promise<void> {
    await cacheService.delete(`user_info:${userId}`);
  }
}

// Export singleton
export const userService = new UserService();
