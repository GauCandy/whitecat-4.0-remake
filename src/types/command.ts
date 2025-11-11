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
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export enum CommandCategory {
  Hosting = 'hosting',
  Economy = 'economy',
  Admin = 'admin',
  Utility = 'utility',
  Config = 'config',
  Giveaway = 'giveaway',
}
