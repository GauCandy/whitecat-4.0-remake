import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionResolvable,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  category: CommandCategory;
  permissions?: PermissionResolvable[];
  cooldown?: number; // in seconds
  requiresAuth?: boolean; // Set to false to skip authorization. Default: true
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/**
 * OAuth2 authorization:
 *
 * requiresAuth: true (default)
 *   - Requires: identify + applications.commands + email
 *   - User must authorize via /verify command
 *
 * requiresAuth: false
 *   - Public command
 *   - No authorization required
 */

export enum CommandCategory {
  Hosting = 'hosting',
  Economy = 'economy',
  Admin = 'admin',
  Utility = 'utility',
  Config = 'config',
  Giveaway = 'giveaway',
}
