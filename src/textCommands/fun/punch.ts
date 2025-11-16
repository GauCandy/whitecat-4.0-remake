import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'punch',
  description: 'Punch someone!',
  usage: 'punch @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to punch! Example: `,punch @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `💀 **${message.author.username}** punches themselves... Self-destruction initiated!`,
        });
        return;
      }

      const loadingMsg = await message.reply('👊 Preparing punch...');
      const gifUrl = await getNekobest(NekobestAction.Punch);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `💥 ORA ORA ORA! **${message.author.username}** punches ${targetNames}! ${targets.length}-hit combo!`,
          `👊 **${message.author.username}** goes full berserker and punches ${targetNames}! BRUTALITY!`,
          `🥊 COMBO BREAKER! **${message.author.username}** delivers rapid punches to ${targetNames}!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `COMBO x${targets.length} by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.punch.bot' : 'commands.fun.punch.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got punched by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in punch text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
