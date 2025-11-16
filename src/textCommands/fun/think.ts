import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'think',
  description: 'Think deeply about something!',
  usage: 'think',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestAction.Think, 'think', '#4682B4');
  },
};

export default command;
