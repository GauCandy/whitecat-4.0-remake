import { Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { executeEmotionalAction } from '../../utils/emotionalCommandHelper';
import { NekobestAction, NekobestExpression } from '../../utils/nekobest';

const command: TextCommand = {
  name: 'facepalm',
  description: 'Facepalm at something!',
  usage: 'facepalm',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    await executeEmotionalAction(message, NekobestExpression.Facepalm, 'facepalm', '#8B4513');
  },
};

export default command;
