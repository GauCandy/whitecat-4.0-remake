import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'kick',
  description: 'Kick someone!',
  usage: 'kick @user',
  category: CommandCategory.Fun,
  cooldown: 3,
  requiresAuth: true,

  async execute(message: Message, args: string[]): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to kick! Example: `,kick @user`',
        });
        return;
      }

      const guildId = message.guildId;
      const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

      const targets = mentionedUsers.filter((u) => u.id !== message.author.id);

      // Self-kick
      if (targets.length === 0) {
        const selfMessages = [
          '🦵 {user} kicks themselves... Ouch! Flexibility 100',
          '😵 {user} just kicked their own leg. That\'s... impressive?',
          '💀 {user} attempts a self-kick. *It hurt itself in its confusion!*',
        ];

        await message.reply({
          content: getRandomMessage(selfMessages).replace('{user}', `**${message.author.username}**`),
        });
        return;
      }

      // MULTIPLE TARGETS: ROUNDHOUSE KICK COMBO!
      if (targets.length > 1) {
        const targetNames = targets.map((u) => `**${u.username}**`).join(', ');
        const comboMessages = [
          `🥋 **${message.author.username}** unleashes a ROUNDHOUSE KICK and hits ${targetNames}! COMBO x${targets.length}! *Street Fighter theme*`,
          `💥 ULTRA COMBO! **${message.author.username}** does a spinning kick hitting ${targetNames}! Fatality!`,
          `🦶 **${message.author.username}** channels their inner Kung Fu master and kicks ${targetNames} in rapid succession! Hi-yah!`,
          `⚡ SWEEP THE LEG! **${message.author.username}** takes down ${targetNames} with consecutive kicks! Brutal!`,
          `🔥 **${message.author.username}** goes full Taekwondo mode and kicks ${targetNames}! ${targets.length}-hit combo!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setDescription(getRandomMessage(comboMessages))
          .setFooter({
            text: `COMBO x${targets.length} by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return;
      }

      // SINGLE TARGET: Normal kick
      const target = targets[0];
      const loadingMsg = await message.reply('🦵 Preparing kick...');
      const gifUrl = await getNekobest(NekobestAction.Kick);

      const isBot = target.id === message.client.user.id;

      const messageKey = isBot ? 'commands.fun.kick.bot' : 'commands.fun.kick.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got kicked by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in kick text command:', error);
      await message.reply({ content: '❌ An error occurred while trying to kick.' });
    }
  },
};

export default command;
