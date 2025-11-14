import { Events, Message, EmbedBuilder, Collection } from 'discord.js';
import type { ExtendedClient } from '../types/client';
import { botLogger } from '../utils/logger';
import { pool } from '../database/config';

// Default prefix
const DEFAULT_PREFIX = '!';

/**
 * Get guild prefix from database
 */
async function getGuildPrefix(guildId: string): Promise<string> {
  try {
    const result = await pool.query('SELECT prefix FROM guilds WHERE guild_id = $1', [guildId]);
    if (result.rows.length > 0 && result.rows[0].prefix) {
      return result.rows[0].prefix;
    }
  } catch (error) {
    botLogger.error(`Failed to get prefix for guild ${guildId}:`, error);
  }
  return DEFAULT_PREFIX;
}

/**
 * Message create event - handles prefix commands
 */
export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    const client = message.client as ExtendedClient;

    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    // Get prefix for this guild
    const prefix = await getGuildPrefix(message.guild.id);

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;

    // Parse command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Get command from textCommands collection (includes aliases)
    const command = client.textCommands.get(commandName);

    if (!command) return;

    try {
      // Check cooldown
      const { cooldowns } = client;
      const commandKey = `text_${command.name}`; // Prefix with 'text_' to avoid conflicts

      if (!cooldowns.has(commandKey)) {
        cooldowns.set(commandKey, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(commandKey)!;
      const cooldownAmount = (command.cooldown ?? 3) * 1000;

      if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setDescription(
              `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again.`
            );

          const reply = await message.reply({ embeds: [embed] });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }
      }

      // Set cooldown
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

      // Check authorization if required
      if (command.requiresAuth !== false) {
        // Check if user is authorized
        const result = await pool.query(
          'SELECT is_authorized, oauth_token_expires_at FROM users WHERE discord_id = $1',
          [message.author.id]
        );

        const user = result.rows[0];
        const isExpired = user?.oauth_token_expires_at
          ? new Date(user.oauth_token_expires_at) < new Date()
          : true;

        if (!user || !user.is_authorized || isExpired) {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🔐 Authorization Required')
            .setDescription(
              `This command requires authorization. Please use \`/verify\` to authorize your account.`
            )
            .setFooter({ text: 'WhiteCat Hosting Bot' })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
          return;
        }
      }

      // Execute text command
      botLogger.info(
        `Text command executed: ${command.name} by ${message.author.tag} in ${message.guild.name}`
      );
      await command.execute(message, args);
    } catch (error) {
      botLogger.error(`Error executing text command ${command.name}:`, error);

      const embed = new EmbedBuilder()
        .setColor(0xf04747)
        .setTitle('❌ Error')
        .setDescription('There was an error executing this command.')
        .setFooter({ text: 'If this persists, please contact support' });

      await message.reply({ embeds: [embed] }).catch(() => {});
    }
  },
};
