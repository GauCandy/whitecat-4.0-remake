import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandOptionsOnlyBuilder,
  Message
} from 'discord.js';

// Slash Command Interface
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>;
}

// Prefix Command Interface
export interface PrefixCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  category?: string;
  execute: (message: Message, args: string[]) => Promise<void>;
}

// Hybrid Command Interface (supports both slash and prefix)
export interface HybridCommand {
  // Slash command data
  slashData: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

  // Prefix command data
  prefixData: {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    category?: string;
  };

  // Execution methods
  executeSlash: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>;
  executePrefix: (message: Message, args: string[]) => Promise<void>;
}

// Legacy support - keep the old Command type for backward compatibility
export interface Command extends SlashCommand {}
