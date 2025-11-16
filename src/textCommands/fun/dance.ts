import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction, NekobestExpression } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'dance',
  description: 'Dance like nobody is watching!',
  usage: 'dance',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Dance, 'dance', '#FF1493');
  },
};

export default command;
