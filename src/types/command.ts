import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionResolvable,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  category: CommandCategory;
  permissions?: PermissionResolvable[];
  cooldown?: number; // in seconds
  requiresAuth?: boolean; // Default: true. Set to false to skip authorization check
  requiredScopes?: string[]; // Additional OAuth2 scopes beyond default (identify + applications.commands)
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/**
 * OAuth2 authorization levels:
 *
 * Level 1 - No authorization:
 *   requiresAuth: false
 *
 * Level 2 - Default authorization (identify + applications.commands):
 *   requiresAuth: true
 *
 * Level 3 - Additional scopes:
 *   requiresAuth: true,
 *   requiredScopes: ['email', 'guilds']
 */

export enum CommandCategory {
  Hosting = 'hosting',
  Economy = 'economy',
  Admin = 'admin',
  Utility = 'utility',
  Config = 'config',
  Giveaway = 'giveaway',
}
