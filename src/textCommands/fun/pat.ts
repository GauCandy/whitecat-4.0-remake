import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'pat',
  aliases: ['vỗ', 'headpat'],
  description: 'Pat someone on the head!',
  usage: 'pat @user [mention more for mass headpats]',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: false,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to pat! Example: `,pat @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-pat
      if (targets.length === 0) {
        const selfMessages = [
          '✨ {user} pats their own head... You did great today!',
          '💫 {user} gives themselves headpats. Self-care is important! ✨',
          '🌟 {user} pats their head gently. You deserve recognition!',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      const loadingMsg = await message.reply('✨ Gentle pats incoming...');
      const gifUrl = await getNekobest(NekobestAction.Pat);

      // MULTIPLE TARGETS: HEADPATS FOR EVERYONE!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const massPatMessages = [
          `✨ **${message.author.username}** gently pats ${targetNames} on the head! Headpats for everyone! *pat pat* 💕`,
          `🌸 Aww! **${message.author.username}** gives soft headpats to ${targetNames}! So wholesome! ✨`,
          `💫 **${message.author.username}** distributes headpats to ${targetNames}! Everyone gets comfort! 🥰`,
          `🌟 **${message.author.username}** showers ${targetNames} with gentle headpats! *pat pat pat* Cuteness overload!`,
          `✨ Mass headpat session! **${message.author.username}** pats ${targetNames}! You all did great! 💖`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FFB6C1')
          .setDescription(getRandomMessage(massPatMessages))
          .setImage(gifUrl)
          .setFooter({
            text: `${targets.length} headpats distributed by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await loadingMsg.edit({ content: '', embeds: [embed] });
        return;
      }

      // SINGLE TARGET: Gentle pat
      const target = targets[0];
      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.pat.bot' : 'commands.fun.pat.message';
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
          text: `${target.username} received headpats from ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in pat text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to pat.' });
    }
  },
};

export default command;
