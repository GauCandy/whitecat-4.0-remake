import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'angry',
  description: 'Show that you are angry!',
  usage: 'angry',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Angry, 'angry', '#FF0000');
  },
};

export default command;
