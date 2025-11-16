import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'nom',
  description: 'Nom nom nom!',
  usage: 'nom [@user]',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);
      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const loadingMsg = await message.reply('🍴 Nom nom...');
      const gifUrl = await getNekobest(NekobestAction.Nom);

      let description = '';

      if (mentionedUsers.length === 0) {
        // No target - just eating
        description = `**${message.author.username}** is eating! *nom nom nom* 🍴`;
      } else {
        const targetNames = mentionedUsers.map(u => `**${u.username}**`).join(', ');
        description = `**${message.author.username}** noms on ${targetNames}! *nom nom nom* 🍴`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF8C00')
        .setDescription(description)
        .setImage(gifUrl)
        .setFooter({
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in nom text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
