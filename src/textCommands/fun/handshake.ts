import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'handshake',
  description: 'Shake someone\'s hand!',
  usage: 'handshake @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to handshake with! Example: `,handshake @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `🤝 **${message.author.username}** shakes their own hand... Awkward!`,
        });
        return;
      }

      const loadingMsg = await message.reply('🤝 Handshaking...');
      const gifUrl = await getNekobest(NekobestAction.Handshake);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `🤝 Business mode! **${message.author.username}** shakes hands with ${targetNames}! Professional!`,
          `💼 **${message.author.username}** goes around shaking hands with ${targetNames}! Networking!`,
          `🎩 **${message.author.username}** does a handshake tour with ${targetNames}! Classy!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#4169E1')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `${targets.length} handshakes by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.handshake.bot' : 'commands.fun.handshake.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#4169E1')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `Handshake between ${message.author.username} and ${target.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in handshake text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
