import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'pout',
  description: 'Pout like a cute anime character!',
  usage: 'pout',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Pout, 'pout', '#FFB6C1');
  },
};

export default command;
