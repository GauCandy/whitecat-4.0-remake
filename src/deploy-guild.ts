/**
 * Deploy commands to a specific guild (from GUILD_ID in .env)
 * This is a wrapper around deploy-commands.ts for convenience
 */

import { config } from './config';
import { spawn } from 'child_process';
import path from 'path';

const deployScript = path.join(__dirname, 'deploy-commands.ts');
const guildId = config.guildId;

console.log(`[INFO] Deploying to guild: ${guildId} (from .env)`);

// Execute deploy-commands.ts with guild ID argument
const child = spawn('ts-node', [deployScript, guildId], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
