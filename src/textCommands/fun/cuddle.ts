import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'cuddle',
  aliases: ['ômấp', 'ôm ấp'],
  description: 'Cuddle with someone!',
  usage: 'cuddle @user',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: false,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to cuddle! Example: `,cuddle @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-cuddle
      if (targets.length === 0) {
        const selfMessages = [
          '🥺 {user} cuddles themselves... Aww, need a friend?',
          '💙 {user} wraps themselves in a blanket and cuddles. Cozy vibes!',
          '🫂 {user} gives themselves a self-cuddle. Self-care! ✨',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      // MULTIPLE TARGETS: CUDDLE PILE!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const cuddlePileMessages = [
          `🫂 CUDDLE PILE! **${message.author.username}** cuddles with ${targetNames}! So warm and cozy! 💕`,
          `💖 Wholesome overload! **${message.author.username}** creates a cuddle pile with ${targetNames}! *warm fuzzy feelings*`,
          `✨ **${message.author.username}** initiates a group cuddle session with ${targetNames}! Comfort level: MAX!`,
          `🥰 SO WHOLESOME! **${message.author.username}** cuddles ${targetNames} in a big cozy pile! Cuteness x${targets.length}!`,
          `💫 **${message.author.username}** brings ${targetNames} into a warm cuddle pile! *happy noises* 🌸`,
        ];

        const loadingMsg = await message.reply('🫂 Creating cuddle pile...');
        const gifUrl = await getNekobest(NekobestAction.Cuddle);

        const embed = new EmbedBuilder()
          .setColor('#FFC0CB')
          .setDescription(getRandomMessage(cuddlePileMessages))
          .setImage(gifUrl)
          .setFooter({
            text: `Cuddle pile initiated by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await loadingMsg.edit({ content: '', embeds: [embed] });
        return;
      }

      // SINGLE TARGET: Romantic cuddle
      const target = targets[0];
      const loadingMsg = await message.reply('💕 Cuddling...');
      const gifUrl = await getNekobest(NekobestAction.Cuddle);

      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.cuddle.bot' : 'commands.fun.cuddle.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FFC0CB')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${message.author.username} and ${target.username} are cuddling`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in cuddle text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to cuddle.' });
    }
  },
};

export default command;
