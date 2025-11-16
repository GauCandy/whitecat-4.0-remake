import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'highfive',
  description: 'Give someone a high five!',
  usage: 'highfive @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to high five! Example: `,highfive @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `✋ **${message.author.username}** high fives the air... Forever alone!`,
        });
        return;
      }

      const loadingMsg = await message.reply('✋ High five incoming...');
      const gifUrl = await getNekobest(NekobestAction.Highfive);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `✋ HIGH FIVE CHAIN! **${message.author.username}** high fives ${targetNames}! Teamwork!`,
          `🙌 **${message.author.username}** goes around high fiving ${targetNames}! Positive vibes!`,
          `✨ MULTI HIGH FIVE! **${message.author.username}** and ${targetNames}! We did it!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `${targets.length} high fives by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.highfive.bot' : 'commands.fun.highfive.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `High five between ${message.author.username} and ${target.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in highfive text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
