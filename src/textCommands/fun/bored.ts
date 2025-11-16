import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction, NekobestExpression } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'bored',
  description: 'Show that you are bored!',
  usage: 'bored',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Bored, 'bored', '#808080');
  },
};

export default command;
