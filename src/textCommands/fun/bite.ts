import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'bite',
  aliases: ['cắn'],
  description: 'Bite someone!',
  usage: 'bite @user',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: false,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to bite! Example: `,bite @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-bite
      if (targets.length === 0) {
        const selfMessages = [
          '😬 {user} bites themselves... Are you a masochist?!',
          '🦷 {user} chomps on their own arm. *nom nom* Why tho?',
          '💀 {user} just bit themselves. Cannibalism? No. Confusion? Yes.',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      // MULTIPLE TARGETS: VAMPIRE MODE!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const vampireMessages = [
          `🧛 VAMPIRE MODE ACTIVATED! **${message.author.username}** bites ${targetNames}! Nom nom nom! *feral noises*`,
          `😈 **${message.author.username}** goes full cannibal and bites ${targetNames}! Someone stop them!`,
          `🦷 CHOMP CHOMP CHOMP! **${message.author.username}** bites ${targetNames} like a wild animal! Rabies alert! 🚨`,
          `💀 **${message.author.username}** has entered FERAL MODE and bites ${targetNames}! ${targets.length}x BITE COMBO!`,
          `🧟 Zombie apocalypse! **${message.author.username}** bites ${targetNames}! The infection spreads!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#8B0000')
          .setDescription(getRandomMessage(vampireMessages))
          .setFooter({
            text: `${targets.length} bite marks by ${message.author.username} 🦷`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // SINGLE TARGET: Playful bite
      const target = targets[0];
      const loadingMsg = await message.reply('🦷 Nom nom...');
      const gifUrl = await getNekobest(NekobestAction.Bite);

      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.bite.bot' : 'commands.fun.bite.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got bitten by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in bite text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to bite.' });
    }
  },
};

export default command;
