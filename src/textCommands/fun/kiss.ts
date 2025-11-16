import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'kiss',
  description: 'Give someone a kiss!',
  usage: 'kiss @user',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: true,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to kiss! Example: `,kiss @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      // Filter out the author
      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-kiss
      if (targets.length === 0) {
        const selfMessages = [
          '😳 {user} kisses themselves... Uh, okay then.',
          '🤨 {user} kisses the mirror. Self-confidence level: 100',
          '💋 {user} blows a kiss to themselves. Narcissism intensifies!',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      // MULTIPLE TARGETS: SCANDAL!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const scandalMessages = [
          `😳 Wait... **${message.author.username}** wants to kiss ${targetNames}?! WHAT?! Nhưng tại sao bạn lại muốn làm điều đó?!?!`,
          `🤨 **${message.author.username}** is trying to kiss ${targetNames} all at once... Bruh. That's not how this works!`,
          `😱 SCANDAL! **${message.author.username}** just attempted to kiss ${targetNames}! Someone call the drama police!`,
          `🚨 Hold up! **${message.author.username}** kissing ${targetNames}?! This is getting out of hand! Pick one!`,
          `💀 **${message.author.username}** really thought they could kiss ${targetNames} and get away with it. Nah fam.`,
        ];

        await message.reply({
          content: getRandomMessage(scandalMessages),
        });
        return;
      }

      // SINGLE TARGET: Normal kiss
      const target = targets[0];
      const loadingMsg = await message.reply('🔄 Loading...');
      const gifUrl = await getNekobest(NekobestAction.Kiss);

      const isBot = target.id === message.client.user.id;

      // Get message
      const messageKey = isBot ? 'commands.fun.kiss.bot' : 'commands.fun.kiss.message';
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
          text: `Requested by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in kiss text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to kiss.' });
    }
  },
};

export default command;
