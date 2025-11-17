import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, User } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your account profile and statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another user\'s profile (optional)')
        .setRequired(false)
    ),

  category: CommandCategory.Utility,
  cooldown: 5,
  requiresAuth: false, // Can view profile without auth, but limited info

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Get target user (mentioned user or self)
      const targetUser: User = interaction.options.getUser('user') || interaction.user;
      const isSelf = targetUser.id === interaction.user.id;

      // Get user from database with JOIN to extended tables
      const userResult = await pool.query(
        `SELECT
          u.id, u.discord_id, u.username, u.created_at, u.last_seen,
          ue.balance
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_oauth uo ON u.id = uo.user_id
         LEFT JOIN user_economy ue ON u.id = ue.user_id AND ue.currency_id = 1
         WHERE u.discord_id = $1`,
        [targetUser.id]
      );

      if (userResult.rows.length === 0) {
        await interaction.editReply({
          content: isSelf
            ? '❌ You are not registered yet! Use `/register` to create an account.'
            : '❌ This user is not registered.',
        });
        return;
      }

      const dbUser = userResult.rows[0];
      const userId = dbUser.id;

      // Get transaction statistics
      const transactionStats = await pool.query(
        `SELECT
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount) FILTER (WHERE type = 'purchase'), 0) as total_spent,
          COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_receive'), 0) as total_received,
          COALESCE(SUM(amount) FILTER (WHERE type = 'transfer_send'), 0) as total_sent
         FROM transactions
         WHERE user_id = $1`,
        [userId]
      );

      const totalTransactions = parseInt(transactionStats.rows[0].total_transactions) || 0;
      const totalSpent = parseInt(transactionStats.rows[0].total_spent) || 0;
      const totalReceived = parseInt(transactionStats.rows[0].total_received) || 0;
      const totalSent = parseInt(transactionStats.rows[0].total_sent) || 0;

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${isSelf ? '👤 Your Profile' : `👤 ${targetUser.username}'s Profile`}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: '📊 Account Information',
            value: [
              `**Discord:** ${targetUser.tag}`,
              `**User ID:** \`${targetUser.id}\``,
              `**Registered:** <t:${Math.floor(new Date(dbUser.created_at).getTime() / 1000)}:R>`,
              `**Last Seen:** <t:${Math.floor(new Date(dbUser.last_seen).getTime() / 1000)}:R>`,
            ].join('\n'),
            inline: false,
          }
        );

      // Add economy info (only show to self or if viewing others)
      if (isSelf || dbUser.balance !== null) {
        const balance = dbUser.balance !== null ? parseInt(dbUser.balance) : 0;

        embed.addFields({
          name: '💰 Economy',
          value: [
            `**Balance:** ${balance.toLocaleString()} coins`,
            `**Total Spent:** ${totalSpent.toLocaleString()} coins`,
            totalReceived > 0 ? `**Total Received:** ${totalReceived.toLocaleString()} coins` : null,
            totalSent > 0 ? `**Total Sent:** ${totalSent.toLocaleString()} coins` : null,
            `**Transactions:** ${totalTransactions}`,
          ]
            .filter(Boolean)
            .join('\n'),
          inline: false,
        });
      }

      // Add verification status (only for self)
      if (isSelf) {
        const isAuthorized = !!dbUser.refresh_token;
        embed.addFields({
          name: '🔐 Verification Status',
          value: [
            `**Authorized:** ${isAuthorized ? '✅ Yes' : '❌ No'}`,
            dbUser.email ? `**Email Verified:** ✅ ${dbUser.email}` : '❌ No email verified',
          ].join('\n'),
          inline: false,
        });
      }

      embed.setTimestamp().setFooter({ text: 'WhiteCat Bot' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /profile command:', error);

      let errorMessage = '❌ Failed to load profile. Please try again later.';

      if (error instanceof Error) {
        errorMessage += `\n\n**Error:** ${error.message}`;
      }

      await interaction.editReply({ content: errorMessage });
    }
  },
};

export default command;
