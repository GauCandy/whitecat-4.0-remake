import { Message, EmbedBuilder } from 'discord.js';
import { getNekobest, NekobestAction, NekobestExpression } from './nekobest';
import { getGuildLocale, t, Locale } from './i18n';
import logger from './logger';

/**
 * Execute an emotional/self action command (no target needed)
 * These commands just show the user performing an emotion/action
 */
export async function executeEmotionalAction(
  message: Message,
  action: NekobestAction | NekobestExpression,
  commandName: string,
  color: string = '#FFB300'
): Promise<void> {
  try {
    const guildId = message.guildId;
    const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

    // Send loading message
    const loadingMsg = await message.reply('🔄 Loading...');

    // Fetch GIF from Nekobest API
    const gifUrl = await getNekobest(action);

    // Get message from i18n
    const messageKey = `commands.fun.${commandName}.message`;
    const messages = t(locale, messageKey);
    const messageText = Array.isArray(messages)
      ? messages[Math.floor(Math.random() * messages.length)]
      : messages;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(color as any)
      .setDescription(messageText.replace('{user}', `**${message.author.username}**`))
      .setImage(gifUrl)
      .setFooter({
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await loadingMsg.edit({ content: '', embeds: [embed] });
  } catch (error) {
    logger.error(`Error in ${commandName} text command:`, error);
    await message.reply({ content: '❌ An error occurred.' });
  }
}
