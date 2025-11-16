import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'yawn',
  description: 'Yawn when you are sleepy!',
  usage: 'yawn',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Yawn, 'yawn', '#708090');
  },
};

export default command;
