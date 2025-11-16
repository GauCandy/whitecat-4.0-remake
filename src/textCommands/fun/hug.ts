import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'hug',
  description: 'Give someone a warm hug!',
  usage: 'hug @user [mention more for group hug]',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: true,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to hug! Example: `,hug @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      // Filter out the author from mentioned users
      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Check if only self-mentioned
      if (targets.length === 0) {
        const selfMessages = [
          '🤗 {user} hugs themselves... Aww, self-love is important!',
          '💙 {user} gives themselves a hug. You deserve it!',
          '🫂 {user} wraps their arms around themselves. So wholesome!',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      const loadingMsg = await message.reply('🔄 Spreading the love...');
      const gifUrl = await getNekobest(NekobestAction.Hug);

      // MULTIPLE TARGETS: GROUP HUG!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const groupHugMessages = [
          `🤗 **${message.author.username}** gives a big group hug to ${targetNames}! Everyone needs a hug! 💕`,
          `🫂 GROUP HUG TIME! **${message.author.username}** hugs ${targetNames} all at once! So much love! ❤️`,
          `💙 **${message.author.username}** spreads their arms wide and hugs ${targetNames}! Wholesome! ✨`,
          `🌟 **${message.author.username}** initiates a group hug with ${targetNames}! *warm fuzzy feelings*`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FFB300')
          .setDescription(getRandomMessage(groupHugMessages))
          .setImage(gifUrl)
          .setFooter({
            text: `Group hug requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await loadingMsg.edit({ content: '', embeds: [embed] });
        return;
      }

      // SINGLE TARGET
      const target = targets[0];
      const isBot = target.id === message.client.user.id;

      // Get message
      const messageKey = isBot ? 'commands.fun.hug.bot' : 'commands.fun.hug.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FFB300')
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
      logger.error('Error in hug text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to hug.' });
    }
  },
};

export default command;
