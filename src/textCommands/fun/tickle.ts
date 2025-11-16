import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'tickle',
  description: 'Tickle someone until they laugh!',
  usage: 'tickle @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to tickle! Example: `,tickle @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `😂 **${message.author.username}** tries to tickle themselves... That doesn't work!`,
        });
        return;
      }

      const loadingMsg = await message.reply('✨ Tickling...');
      const gifUrl = await getNekobest(NekobestAction.Tickle);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `😂 TICKLE ATTACK! **${message.author.username}** tickles ${targetNames}! Laughter everywhere!`,
          `✨ **${message.author.username}** tickles ${targetNames} mercilessly! Stop! Hahahaha!`,
          `🤣 **${message.author.username}** unleashes tickle madness on ${targetNames}! Can't breathe!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FFB6C1')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `Tickle fest by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.tickle.bot' : 'commands.fun.tickle.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got tickled by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in tickle text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
