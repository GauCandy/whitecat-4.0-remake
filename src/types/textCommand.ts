import { Message } from 'discord.js';
import { CommandCategory } from './command';

/**
 * Text/Prefix Command structure
 */
export interface TextCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  cooldown?: number; // in seconds
  requiresAuth?: boolean; // Set to false to skip authorization. Default: true
  execute(message: Message, args: string[]): Promise<void>;
}
