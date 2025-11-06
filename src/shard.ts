/**
 * Shard Entry Point
 * This file is executed by the ShardingManager for each shard
 *
 * Features:
 * - Auto-sharding based on server count
 * - Cross-shard communication
 * - Graceful shard restart
 */

import { ShardingManager } from 'discord.js';
import { config } from './config';
import Logger from './utils/logger';
import path from 'path';

// Create sharding manager
const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
  token: config.token,
  // 'auto' = Discord will recommend shard count
  // For < 1000 servers: 1 shard
  // For 1000-2000 servers: 2 shards
  // For 2000+ servers: auto-calculated
  totalShards: 'auto',

  // Spawn mode
  mode: 'process', // Each shard runs in separate process

  // Respawn shards if they die
  respawn: true,

  // Timeout for shard ready
  shardArgs: [],
  execArgv: [],
});

// Event: Shard created
manager.on('shardCreate', (shard) => {
  Logger.success(`Shard ${shard.id} launched`);

  // Listen to shard events
  shard.on('ready', () => {
    Logger.success(`Shard ${shard.id} is ready`);
  });

  shard.on('disconnect', () => {
    Logger.warn(`Shard ${shard.id} disconnected`);
  });

  shard.on('reconnecting', () => {
    Logger.info(`Shard ${shard.id} reconnecting...`);
  });

  shard.on('death', () => {
    Logger.error(`Shard ${shard.id} died`);
  });

  shard.on('error', (error) => {
    Logger.error(`Shard ${shard.id} encountered an error`, error);
  });
});

// Spawn all shards
async function startShards() {
  try {
    Logger.banner();
    Logger.separator();
    Logger.blank();
    Logger.system('Starting Shard Manager...');
    Logger.blank();

    // Spawn shards
    await manager.spawn({
      amount: 'auto',
      delay: 5500, // 5.5 seconds between each shard spawn
      timeout: 60000, // 60 seconds timeout
    });

    Logger.blank();
    Logger.separator();
    Logger.success(`All shards spawned successfully!`);
    Logger.info(`Total shards: ${manager.totalShards}`);
    Logger.separator();
    Logger.blank();

    // Display shard info
    const shardInfo = await Promise.all(
      manager.shards.map(async (shard) => {
        const guilds = await shard.fetchClientValue('guilds.cache.size') as number;
        const users = await shard.fetchClientValue('users.cache.size') as number;
        return {
          id: shard.id,
          guilds,
          users,
        };
      })
    );

    Logger.table({
      'Shards': manager.totalShards.toString(),
      'Total Guilds': shardInfo.reduce((acc, s) => acc + s.guilds, 0).toString(),
      'Total Users': shardInfo.reduce((acc, s) => acc + s.users, 0).toString(),
    });

    Logger.blank();
  } catch (error) {
    Logger.error('Failed to start shards', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  Logger.blank();
  Logger.system('Received SIGINT, shutting down all shards...');
  Logger.blank();

  try {
    // Destroy all shards
    await Promise.all(
      manager.shards.map((shard) => shard.respawn({ delay: 0, timeout: 5000 }))
    );

    Logger.success('All shards shut down gracefully');
    process.exit(0);
  } catch (error) {
    Logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  Logger.system('Received SIGTERM, shutting down...');
  await manager.respawnAll({ shardDelay: 5500, respawnDelay: 500, timeout: 30000 });
  process.exit(0);
});

// Start shards
startShards();
