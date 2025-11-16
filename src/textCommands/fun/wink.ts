import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'wink',
  description: 'Wink at someone!',
  usage: 'wink [@user]',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);
      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const loadingMsg = await message.reply('😉 Winking...');
      const gifUrl = await getNekobest(NekobestAction.Wink);

      let description = '';

      if (mentionedUsers.length === 0) {
        // No target - just wink
        description = `**${message.author.username}** winks! 😉`;
      } else {
        const targetNames = mentionedUsers.map(u => `**${u.username}**`).join(', ');
        description = `**${message.author.username}** winks at ${targetNames}! 😉`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setDescription(description)
        .setImage(gifUrl)
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in wink text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
