/**
 * Command Manager
 * Handles command loading, caching, and execution with support for:
 * - Category-based organization
 * - Lazy loading
 * - LRU cache for memory optimization
 * - Cross-shard compatibility
 */

import { Collection } from 'discord.js';
import { Command, PrefixCommand, HybridCommand } from '../types/command';
import Logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface CommandMetadata {
  name: string;
  category: string;
  filePath: string;
  aliases: string[];
  type: 'slash' | 'prefix' | 'hybrid';
  enabled: boolean;
}

export class CommandManager {
  // Registry - chỉ chứa metadata (nhẹ)
  private registry = new Map<string, CommandMetadata>();

  // Cache - chứa commands đã load (LRU)
  private commandCache = new Map<string, any>();
  private cacheMaxSize = 50; // Chỉ giữ 50 commands hot nhất trong RAM
  private cacheUsage = new Map<string, number>(); // Track usage count

  // Collections for Discord.js
  private slashCommands = new Collection<string, Command>();
  private prefixCommands = new Collection<string, PrefixCommand | HybridCommand>();
  private hybridCommands = new Collection<string, HybridCommand>();

  // Hot commands - luôn giữ trong RAM
  private static HOT_COMMANDS = ['ping', 'help'];

  /**
   * Initialize command manager
   * - Scan all command files
   * - Build registry
   * - Preload hot commands
   */
  async initialize(): Promise<void> {
    Logger.bot('Initializing Command Manager...');

    // Step 1: Build registry (fast - chỉ scan files)
    await this.buildRegistry();

    // Step 2: Preload hot commands
    await this.preloadHotCommands();

    Logger.success(`Command Manager initialized: ${this.registry.size} commands registered`);
  }

  /**
   * Build command registry by scanning command directories
   */
  private async buildRegistry(): Promise<void> {
    const commandsPath = path.join(__dirname, '../commands');
    const categories = fs.readdirSync(commandsPath);

    let totalCommands = 0;

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);

      // Skip if not a directory
      if (!fs.statSync(categoryPath).isDirectory()) continue;

      const files = fs.readdirSync(categoryPath)
        .filter((file) => {
          const ext = path.extname(file);
          const isDeclaration = file.endsWith('.d.ts');
          return !isDeclaration && (ext === '.ts' || ext === '.js');
        });

      for (const file of files) {
        const commandName = file.replace(/\.(ts|js)$/, '');
        const filePath = path.relative(
          path.join(__dirname, '..'),
          path.join(categoryPath, file)
        );

        // Register metadata (không load command)
        const metadata: CommandMetadata = {
          name: commandName,
          category,
          filePath,
          aliases: [], // Sẽ được populate khi load command
          type: 'hybrid', // Default, sẽ detect khi load
          enabled: true,
        };

        this.registry.set(commandName, metadata);
        totalCommands++;
      }

      Logger.listItem(`Registered ${files.length} commands in ${category}`, 'success');
    }

    Logger.success(`Built registry: ${totalCommands} commands`);
  }

  /**
   * Preload hot commands (frequently used)
   */
  private async preloadHotCommands(): Promise<void> {
    Logger.debug('Preloading hot commands...');

    for (const name of CommandManager.HOT_COMMANDS) {
      const metadata = this.registry.get(name);
      if (metadata) {
        await this.loadCommand(name);
        Logger.debug(`Preloaded hot command: ${name}`);
      }
    }
  }

  /**
   * Load command from disk (lazy loading)
   */
  private async loadCommand(name: string): Promise<any> {
    // Check if already in cache
    if (this.commandCache.has(name)) {
      this.cacheUsage.set(name, (this.cacheUsage.get(name) || 0) + 1);
      return this.commandCache.get(name);
    }

    // Get metadata
    const metadata = this.registry.get(name);
    if (!metadata || !metadata.enabled) {
      return null;
    }

    try {
      // Load command from disk
      const commandPath = path.join(__dirname, '..', metadata.filePath);
      const command = require(commandPath).default;

      // Update metadata with actual info
      if (this.isHybridCommand(command)) {
        metadata.type = 'hybrid';
        metadata.aliases = command.prefixData.aliases || [];

        // Register in collections
        this.hybridCommands.set(command.slashData.name, command);
        this.prefixCommands.set(command.prefixData.name, command);

        // Register aliases
        for (const alias of metadata.aliases) {
          this.prefixCommands.set(alias, command);
          this.registry.set(alias, metadata); // Register alias in registry
        }
      } else if (this.isPrefixCommand(command)) {
        metadata.type = 'prefix';
        metadata.aliases = command.aliases || [];
        this.prefixCommands.set(command.name, command);

        for (const alias of metadata.aliases) {
          this.prefixCommands.set(alias, command);
          this.registry.set(alias, metadata);
        }
      } else if (command.data) {
        metadata.type = 'slash';
        this.slashCommands.set(command.data.name, command);
      }

      // Add to cache
      this.addToCache(name, command);

      Logger.debug(`Loaded command: ${name} (${metadata.type})`);
      return command;
    } catch (error) {
      Logger.error(`Failed to load command: ${name}`, error);
      return null;
    }
  }

  /**
   * Add command to cache with LRU eviction
   */
  private addToCache(name: string, command: any): void {
    // If cache is full, evict least used
    if (this.commandCache.size >= this.cacheMaxSize) {
      this.evictLeastUsed();
    }

    this.commandCache.set(name, command);
    this.cacheUsage.set(name, 0);
  }

  /**
   * Evict least used command from cache
   */
  private evictLeastUsed(): void {
    let minUsage = Infinity;
    let leastUsedKey = '';

    // Find least used command (skip hot commands)
    for (const [key, usageCount] of this.cacheUsage.entries()) {
      if (!CommandManager.HOT_COMMANDS.includes(key) && usageCount < minUsage) {
        minUsage = usageCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      // Remove from cache
      this.commandCache.delete(leastUsedKey);
      this.cacheUsage.delete(leastUsedKey);

      // Remove from collections
      const metadata = this.registry.get(leastUsedKey);
      if (metadata) {
        this.slashCommands.delete(leastUsedKey);
        this.prefixCommands.delete(leastUsedKey);
        this.hybridCommands.delete(leastUsedKey);
      }

      Logger.debug(`Evicted command from cache: ${leastUsedKey}`);
    }
  }

  /**
   * Get command (with lazy loading)
   */
  async getCommand(name: string): Promise<any> {
    // Check cache first
    if (this.commandCache.has(name)) {
      return this.commandCache.get(name);
    }

    // Lazy load
    return await this.loadCommand(name);
  }

  /**
   * Get slash command
   */
  getSlashCommand(name: string): Command | HybridCommand | undefined {
    return this.hybridCommands.get(name) || this.slashCommands.get(name);
  }

  /**
   * Get prefix command
   */
  getPrefixCommand(name: string): PrefixCommand | HybridCommand | undefined {
    return this.prefixCommands.get(name);
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): CommandMetadata[] {
    return Array.from(this.registry.values())
      .filter(meta => meta.category === category && meta.name === meta.name) // Skip aliases
      .filter((meta, index, self) => self.findIndex(m => m.name === meta.name) === index);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const metadata of this.registry.values()) {
      categories.add(metadata.category);
    }
    return Array.from(categories);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      registered: this.registry.size,
      cached: this.commandCache.size,
      maxCacheSize: this.cacheMaxSize,
      slashCommands: this.slashCommands.size,
      prefixCommands: this.prefixCommands.size,
      hybridCommands: this.hybridCommands.size,
      topUsed: Array.from(this.cacheUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    };
  }

  /**
   * Type guards
   */
  private isHybridCommand(cmd: any): cmd is HybridCommand {
    return cmd.slashData && cmd.prefixData && cmd.executeSlash && cmd.executePrefix;
  }

  private isPrefixCommand(cmd: any): cmd is PrefixCommand {
    return cmd.name && cmd.execute && !cmd.data && !cmd.slashData;
  }

  /**
   * Reload a specific command
   */
  async reloadCommand(name: string): Promise<boolean> {
    const metadata = this.registry.get(name);
    if (!metadata) return false;

    try {
      // Clear require cache
      const commandPath = path.join(__dirname, '..', metadata.filePath);
      delete require.cache[require.resolve(commandPath)];

      // Remove from cache
      this.commandCache.delete(name);
      this.cacheUsage.delete(name);

      // Remove from collections
      this.slashCommands.delete(name);
      this.prefixCommands.delete(name);
      this.hybridCommands.delete(name);

      // Reload
      await this.loadCommand(name);

      Logger.success(`Reloaded command: ${name}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to reload command: ${name}`, error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Keep hot commands
    for (const name of CommandManager.HOT_COMMANDS) {
      const command = this.commandCache.get(name);
      const usage = this.cacheUsage.get(name);

      this.commandCache.clear();
      this.cacheUsage.clear();

      if (command) {
        this.commandCache.set(name, command);
        this.cacheUsage.set(name, usage || 0);
      }
    }

    Logger.success('Cache cleared (hot commands preserved)');
  }
}

// Export singleton
export const commandManager = new CommandManager();
