import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, User } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Check another user\'s balance (optional)')
        .setRequired(false)
    ),

  category: CommandCategory.Economy,
  cooldown: 3,
  requiresAuth: false, // Can check balance without auth

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Get target user (mentioned user or self)
      const targetUser: User = interaction.options.getUser('user') || interaction.user;
      const isSelf = targetUser.id === interaction.user.id;

      // Get user and economy data
      const result = await pool.query(
        `SELECT
          u.id, u.discord_id, u.username, u.created_at,
          ue.balance, ue.updated_at as balance_updated_at
         FROM users u
         LEFT JOIN user_economy ue ON u.id = ue.user_id AND ue.currency_id = 1
         WHERE u.discord_id = $1`,
        [targetUser.id]
      );

      if (result.rows.length === 0) {
        await interaction.editReply({
          content: isSelf
            ? '❌ You are not registered yet! Use `/register` to create an account and receive starting coins.'
            : `❌ ${targetUser.username} is not registered.`,
        });
        return;
      }

      const dbUser = result.rows[0];
      const userId = dbUser.id;

      // Check if user has economy account
      if (dbUser.balance === null) {
        // Create economy account with 0 balance (they didn't go through /register)
        await pool.query(
          `INSERT INTO user_economy (user_id, currency_id, balance)
           VALUES ($1, 1, 0)
           ON CONFLICT (user_id, currency_id) DO NOTHING`,
          [userId]
        );

        await interaction.editReply({
          content: isSelf
            ? '⚠️ Economy account created with 0 coins. Use `/register` to receive starting bonus!'
            : `⚠️ ${targetUser.username} has 0 coins.`,
        });
        return;
      }

      const balance = parseInt(dbUser.balance);

      // Get recent transactions (last 5)
      const transactionResult = await pool.query(
        `SELECT type, amount, description, created_at
         FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      );

      const recentTransactions = transactionResult.rows;

      // Calculate statistics
      const statsResult = await pool.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'purchase'), 0) as total_spent,
          COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_receive' OR type = 'admin_grant'), 0) as total_earned,
          COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_send'), 0) as total_sent
         FROM transactions
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];
      const totalSpent = parseInt(stats.total_spent) || 0;
      const totalEarned = parseInt(stats.total_earned) || 0;
      const totalSent = parseInt(stats.total_sent) || 0;

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(balance >= 10000 ? 0x57f287 : balance >= 1000 ? 0xffa500 : 0xed4245)
        .setTitle(`${isSelf ? '💰 Your Balance' : `💰 ${targetUser.username}'s Balance`}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .addFields(
          {
            name: '💵 Current Balance',
            value: `**${balance.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: '📊 Statistics',
            value: [
              `**Total Spent:** ${totalSpent.toLocaleString()} coins`,
              `**Total Earned:** ${totalEarned.toLocaleString()} coins`,
              totalSent > 0 ? `**Total Sent:** ${totalSent.toLocaleString()} coins` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            inline: true,
          }
        );

      // Add recent transactions (only for self)
      if (isSelf && recentTransactions.length > 0) {
        const transactionList = recentTransactions
          .map(tx => {
            const emoji = getTransactionEmoji(tx.type);
            const sign = tx.type.includes('receive') || tx.type === 'admin_grant' ? '+' : '-';
            const timeAgo = `<t:${Math.floor(new Date(tx.created_at).getTime() / 1000)}:R>`;
            return `${emoji} ${sign}${Math.abs(tx.amount).toLocaleString()} - ${tx.description || tx.type} ${timeAgo}`;
          })
          .join('\n');

        embed.addFields({
          name: '📜 Recent Transactions',
          value: transactionList,
          inline: false,
        });
      }

      // Add balance status indicator
      let statusMessage = '';
      if (balance >= 100000) {
        statusMessage = '🌟 You\'re rich! Keep up the good work!';
      } else if (balance >= 50000) {
        statusMessage = '💎 You have a healthy balance!';
      } else if (balance >= 10000) {
        statusMessage = '✅ You have enough for basic hosting.';
      } else if (balance >= 1000) {
        statusMessage = '⚠️ Running low on coins. Consider earning more!';
      } else {
        statusMessage = '❌ Very low balance. You need more coins!';
      }

      if (isSelf) {
        embed.addFields({
          name: '💡 Status',
          value: statusMessage,
          inline: false,
        });
      }

      embed
        .setTimestamp()
        .setFooter({
          text: isSelf
            ? 'Use /pay to send coins to others'
            : 'WhiteCat Hosting Bot',
        });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /balance command:', error);

      let errorMessage = '❌ Failed to check balance. Please try again later.';

      if (error instanceof Error) {
        errorMessage += `\n\n**Error:** ${error.message}`;
      }

      await interaction.editReply({ content: errorMessage });
    }
  },
};

/**
 * Get emoji for transaction type
 */
function getTransactionEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    purchase: '🛒',
    transfer_send: '📤',
    transfer_receive: '📥',
    refund: '💸',
    admin_grant: '🎁',
  };

  return emojiMap[type] || '💰';
}

export default command;
