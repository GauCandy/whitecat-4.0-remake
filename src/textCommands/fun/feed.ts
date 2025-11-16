import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'feed',
  description: 'Feed someone!',
  usage: 'feed @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to feed! Example: `,feed @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `🍽️ **${message.author.username}** feeds themselves... Independent!`,
        });
        return;
      }

      const loadingMsg = await message.reply('🍽️ Preparing food...');
      const gifUrl = await getNekobest(NekobestAction.Feed);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `🍱 BUFFET TIME! **${message.author.username}** feeds ${targetNames}! Everyone's full now!`,
          `🍜 **${message.author.username}** opens a restaurant and feeds ${targetNames}! Nom nom!`,
          `🥘 Mass feeding! **${message.author.username}** feeds ${targetNames}! *happy eating noises*`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FF8C00')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `${targets.length} people fed by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.feed.bot' : 'commands.fun.feed.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FF8C00')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got fed by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in feed text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
