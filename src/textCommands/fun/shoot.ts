import { Message, EmbedBuilder } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';
import { parseAllMentionedUsers, getRandomMessage } from '../../utils/funCommandHelper';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: TextCommand = {
  name: 'shoot',
  description: 'Shoot someone (with finger guns!)',
  usage: 'shoot @user',
  category: CommandCategory.Fun,
  cooldown: 3,

  async execute(message: Message): Promise<void> {
    try {
      const mentionedUsers = parseAllMentionedUsers(message);

      if (mentionedUsers.length === 0) {
        await message.reply({
          content: '❌ Please mention someone to shoot! Example: `,shoot @user`',
        });
        return;
      }

      const targets = mentionedUsers.filter(u => u.id !== message.author.id);

      if (targets.length === 0) {
        await message.reply({
          content: `🔫 **${message.author.username}** shoots themselves... *Mission failed, we'll get 'em next time*`,
        });
        return;
      }

      const loadingMsg = await message.reply('🔫 Aiming...');
      const gifUrl = await getNekobest(NekobestAction.Shoot);

      if (targets.length > 1) {
        const targetNames = targets.map(u => `**${u.username}**`).join(', ');
        const messages = [
          `🔫 RAPID FIRE! **${message.author.username}** shoots ${targetNames}! *pew pew pew* Headshot x${targets.length}!`,
          `👉 Finger guns activated! **${message.author.username}** shoots ${targetNames}! Bang bang!`,
          `🎯 **${message.author.username}** goes full John Wick and shoots ${targetNames}! Professional!`,
        ];

        const embed = new EmbedBuilder()
          .setColor('#8B0000')
          .setDescription(getRandomMessage(messages))
          .setImage(gifUrl)
          .setFooter({
            text: `Multi-kill by ${message.author.username}`,
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

      const messageKey = isBot ? 'commands.fun.shoot.bot' : 'commands.fun.shoot.message';
      const messages = t(locale, messageKey);
      const messageText = getRandomMessage(messages);

      const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setDescription(
          messageText
            .replace('{user}', `**${message.author.username}**`)
            .replace('{target}', `**${target.username}**`)
        )
        .setImage(gifUrl)
        .setFooter({
          text: `${target.username} got shot by ${message.author.username}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      logger.error('Error in shoot text command:', error);
      await message.reply({ content: '❌ An error occurred.' });
    }
  },
};

export default command;
