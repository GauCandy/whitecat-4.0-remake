import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'shrug',
  description: 'Shrug it off!',
  usage: 'shrug',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestAction.Shrug, 'shrug', '#A9A9A9');
  },
};

export default command;
