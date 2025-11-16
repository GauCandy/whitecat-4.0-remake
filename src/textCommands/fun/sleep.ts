import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction, NekobestExpression } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'sleep',
  description: 'Time to sleep!',
  usage: 'sleep',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Sleep, 'sleep', '#191970');
  },
};

export default command;
