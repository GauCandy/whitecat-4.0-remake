import { Client, Collection } from 'discord.js';
import { Command } from './command';
import { TextCommand } from './textCommand';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  textCommands: Collection<string, TextCommand>;
  cooldowns: Collection<string, Collection<string, number>>;
}
