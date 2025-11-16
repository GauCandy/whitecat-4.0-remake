import { Message, EmbedBuilder, User } from 'discord.js';
import { getNekobest, NekobestAction } from './nekobest';
import { getGuildLocale, t, Locale } from './i18n';
import logger from './logger';

/**
 * Parse mentioned user from message (single)
 */
export function parseMentionedUser(message: Message, args: string[]): User | null {
  // Check if first argument is a mention
  if (args[0]) {
    // Discord mention format: <@123456789> or <@!123456789>
    const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      const userId = mentionMatch[1];
      return message.mentions.users.get(userId) || null;
    }
  }

  // Fallback: get first mentioned user
  return message.mentions.users.first() || null;
}

/**
 * Parse all mentioned users from message (multiple)
 */
export function parseAllMentionedUsers(message: Message): User[] {
  return Array.from(message.mentions.users.values());
}

/**
 * Get random message from array or return string
 */
export function getRandomMessage(messages: string | string[]): string {
  if (Array.isArray(messages)) {
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return messages;
}

/**
 * Execute a fun action command (text version)
 */
export async function executeFunAction(
  message: Message,
  args: string[],
  action: NekobestAction,
  commandName: string
): Promise<void> {
  try {
    const targetUser = parseMentionedUser(message, args);

    if (!targetUser) {
      await message.reply({
        content: `❌ Please mention a user to ${commandName}! Example: \`,${commandName} @user\``,
      });
      return;
    }

    const guildId = message.guildId;
    const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

    // Check if targeting bot
    const isBot = targetUser.id === message.client.user.id;

    // Prevent self-targeting
    if (targetUser.id === message.author.id) {
      const selfMessages = t(locale, `commands.fun.${commandName}.self`);
      const messageText = Array.isArray(selfMessages)
        ? selfMessages[Math.floor(Math.random() * selfMessages.length)]
        : selfMessages;

      await message.reply({
        content: messageText.replace('{user}', `**${message.author.username}**`),
      });
      return;
    }

    // Send "loading" message
    const loadingMsg = await message.reply('🔄 Loading GIF...');

    // Fetch GIF from Nekobest API
    const gifUrl = await getNekobest(action);

    // Get message (handle bot case or normal)
    const messageKey = isBot ? `commands.fun.${commandName}.bot` : `commands.fun.${commandName}.message`;
    const messages = t(locale, messageKey);
    const messageText = Array.isArray(messages)
      ? messages[Math.floor(Math.random() * messages.length)]
      : messages;

    // Create embed with the action
    const embed = new EmbedBuilder()
      .setColor('#FFB300')
      .setDescription(
        messageText
          .replace('{user}', `**${message.author.username}**`)
          .replace('{target}', `**${targetUser.username}**`)
      )
      .setImage(gifUrl)
      .setFooter({
        text: `Requested by ${message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await loadingMsg.edit({ content: '', embeds: [embed] });
  } catch (error) {
    logger.error(`Error in ${commandName} text command:`, error);

    const errorMessage = t(Locale.EnglishUS, 'commands.fun.error');
    await message.reply({ content: errorMessage });
  }
}
