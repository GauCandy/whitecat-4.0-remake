/**
 * Cache Service
 * Provides caching capabilities with:
 * - TTL (Time To Live)
 * - Automatic cleanup
 * - Cross-shard compatibility (ready for Redis)
 * - Memory optimization
 */

import Logger from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expires: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000),
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get multiple keys at once
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * Set multiple values at once
   */
  async setMany<T>(entries: Map<string, T>, ttl: number): Promise<void> {
    for (const [key, value] of entries.entries()) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch and cache
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    Logger.debug('Cache cleanup started');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      Logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      Logger.debug('Cache cleanup stopped');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }
}

// Export singleton
export const cacheService = new CacheService();