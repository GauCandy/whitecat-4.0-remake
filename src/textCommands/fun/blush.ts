import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestExpression } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'blush',
  description: 'Blush because of someone!',
  usage: 'blush [@user]',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);
      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const loadingMsg = await message.reply('😊 Blushing...');
      const gifUrl = await getNekobest(NekobestExpression.Blush);

      let description = '';

      if (mentionedUsers.length === 0) {
        // No target - just blushing
        description = `**${message.author.username}** is blushing! 😳 So cute!`;
      } else {
        const targetNames = mentionedUsers.map(u => `**${u.username}**`).join(', ');
        description = `**${message.author.username}** blushes because of ${targetNames}! 😳💕`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setDescription(description)
        .setImage(gifUrl)
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in blush text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
