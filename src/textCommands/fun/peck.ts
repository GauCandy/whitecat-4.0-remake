import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'peck',
  description: 'Give someone a quick peck!',
  usage: 'peck @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to peck! Example: `,peck @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `💋 **${message.author.username}** pecks themselves... Okay then!`,
        });
        return;
      }

      const loadingMsg = await message.reply('💋 Quick peck incoming...');
      const gifUrl = await getNekobest(NekobestAction.Peck);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `💋 Peck spree! **${message.author.username}** gives quick pecks to ${targetNames}! *mwah mwah*`,
          `😳 **${message.author.username}** pecks ${targetNames} one by one! So many pecks!`,
          `💕 **${message.author.username}** distributes pecks to ${targetNames}! Spreading the love!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FF69B4')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `Peck session by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await loadingMsg.edit({ content: '', embeds: [embed] });
        return;
      }

      const target = targets[0];
      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;
      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.peck.bot' : 'commands.fun.peck.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got a peck from ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in peck text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
