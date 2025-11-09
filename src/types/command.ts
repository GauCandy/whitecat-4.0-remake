import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandOptionsOnlyBuilder,
  Message
} from 'discord.js';

// Verification level for commands
export type VerificationLevel = 'basic' | 'verified';

// Slash Command Interface
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>;
  verificationLevel?: VerificationLevel; // Default: 'basic' (requires terms only). Set to 'verified' for email verification
  ownerOnly?: boolean; // If true, only bot owner (from OWNER_ID in .env) can use this command
  cooldown?: number; // Cooldown in seconds (default: 0 - no cooldown)
}

// Prefix Command Interface
export interface PrefixCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  category?: string;
  execute: (message: Message, args: string[]) => Promise<void>;
  verificationLevel?: VerificationLevel; // Default: 'basic' (requires terms only). Set to 'verified' for email verification
  ownerOnly?: boolean; // If true, only bot owner (from OWNER_ID in .env) can use this command
  cooldown?: number; // Cooldown in seconds (default: 0 - no cooldown)
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
  verificationLevel?: VerificationLevel; // Default: 'basic' (requires terms only). Set to 'verified' for email verification
  ownerOnly?: boolean; // If true, only bot owner (from OWNER_ID in .env) can use this command
  cooldown?: number; // Cooldown in seconds (default: 0 - no cooldown)
}

// Legacy support - keep the old Command type for backward compatibility
export interface Command extends SlashCommand {}
