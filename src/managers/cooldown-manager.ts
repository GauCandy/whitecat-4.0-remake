/**
 * Cooldown Manager
 * Manages command cooldowns to prevent spam
 */

class CooldownManager {
  // Map<userId, Map<commandName, expiresAt>>
  private cooldowns: Map<string, Map<string, number>> = new Map();

  /**
   * Check if user is on cooldown for a command
   * @param userId Discord user ID
   * @param commandName Command name
   * @returns Remaining seconds if on cooldown, 0 if not on cooldown
   */
  getRemainingCooldown(userId: string, commandName: string): number {
    const userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) return 0;

    const expiresAt = userCooldowns.get(commandName);
    if (!expiresAt) return 0;

    const now = Date.now();
    if (now >= expiresAt) {
      // Cooldown expired, cleanup
      userCooldowns.delete(commandName);
      if (userCooldowns.size === 0) {
        this.cooldowns.delete(userId);
      }
      return 0;
    }

    return Math.ceil((expiresAt - now) / 1000);
  }

  /**
   * Set cooldown for user on a command
   * @param userId Discord user ID
   * @param commandName Command name
   * @param seconds Cooldown duration in seconds
   */
  setCooldown(userId: string, commandName: string, seconds: number): void {
    if (seconds <= 0) return;

    let userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) {
      userCooldowns = new Map();
      this.cooldowns.set(userId, userCooldowns);
    }

    const expiresAt = Date.now() + (seconds * 1000);
    userCooldowns.set(commandName, expiresAt);
  }

  /**
   * Clear cooldown for user on a specific command
   * @param userId Discord user ID
   * @param commandName Command name
   */
  clearCooldown(userId: string, commandName: string): void {
    const userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) return;

    userCooldowns.delete(commandName);
    if (userCooldowns.size === 0) {
      this.cooldowns.delete(userId);
    }
  }

  /**
   * Clear all cooldowns for a user
   * @param userId Discord user ID
   */
  clearUserCooldowns(userId: string): void {
    this.cooldowns.delete(userId);
  }

  /**
   * Clear all cooldowns (useful for bot restart/reload)
   */
  clearAllCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Get statistics about current cooldowns
   */
  getStats() {
    let totalCooldowns = 0;
    for (const userCooldowns of this.cooldowns.values()) {
      totalCooldowns += userCooldowns.size;
    }

    return {
      users: this.cooldowns.size,
      totalCooldowns,
    };
  }

  /**
   * Cleanup expired cooldowns (run periodically)
   */
  cleanup(): void {
    const now = Date.now();

    for (const [userId, userCooldowns] of this.cooldowns.entries()) {
      for (const [commandName, expiresAt] of userCooldowns.entries()) {
        if (now >= expiresAt) {
          userCooldowns.delete(commandName);
        }
      }

      if (userCooldowns.size === 0) {
        this.cooldowns.delete(userId);
      }
    }
  }
}

export const cooldownManager = new CooldownManager();

// Cleanup expired cooldowns every 5 minutes
setInterval(() => {
  cooldownManager.cleanup();
}, 5 * 60 * 1000);
