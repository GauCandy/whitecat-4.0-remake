import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'slap',
  description: 'Slap someone (ouch!)',
  usage: 'slap @user',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: true,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to slap! Example: `,slap @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-slap
      if (targets.length === 0) {
        const selfMessages = [
          '😵 {user} slaps themselves... Are you okay?!',
          '🤦 {user} just slapped themselves. Masochism 100',
          '💢 {user} slaps their own face. *ouch* Why would you do that?',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      // MULTIPLE TARGETS: VIOLENCE SPREE!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const spreeMessages = [
          `💥 **${message.author.username}** goes on a SLAPPING SPREE and slaps ${targetNames}! Violence has escalated! 🚨`,
          `🤬 CHAOS! **${message.author.username}** slaps ${targetNames} one after another! Someone stop this madness!`,
          `😱 **${message.author.username}** chose violence today and slapped ${targetNames}! Brutality x${targets.length}!`,
          `💢 COMBO x${targets.length}! **${message.author.username}** delivers rapid slaps to ${targetNames}! *Mortal Kombat theme plays*`,
          `🔥 **${message.author.username}** activated berserk mode and slapped ${targetNames}! Critical hit!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(getRandomMessage(spreeMessages))
          .setFooter({
            text: `${targets.length}x COMBO by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // SINGLE TARGET: Normal slap
      const target = targets[0];
      const loadingMsg = await message.reply('💥 Preparing slap...');
      const gifUrl = await getNekobest(NekobestAction.Slap);

      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.slap.bot' : 'commands.fun.slap.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FF6347')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got slapped by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in slap text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to slap.' });
    }
  },
};

export default command;
