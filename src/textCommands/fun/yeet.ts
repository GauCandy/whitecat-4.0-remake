import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction, NekobestExpression } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'yeet',
  description: 'YEET!',
  usage: 'yeet',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestAction.Yeet, 'yeet', '#FF4500');
  },
};

export default command;
