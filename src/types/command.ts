import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>;
}
