import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balances')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Check another user\'s balance (optional)')
        .setRequired(false)
    ),

  category: CommandCategory.Economy,
  cooldown: 3,
  requiresAuth: false,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply(); // Public reply

    try {
      // Get target user (mentioned user or self)
      const targetUser: User = interaction.options.getUser('user') || interaction.user;
      const isSelf = targetUser.id === interaction.user.id;

      // Get user from database
      const userResult = await pool.query(
        'SELECT id FROM users WHERE discord_id = $1',
        [targetUser.id]
      );

      if (userResult.rows.length === 0) {
        await interaction.editReply({
          content: isSelf
            ? '❌ You are not registered yet! Use `/register` to create an account.'
            : `❌ ${targetUser.username} is not registered.`,
        });
        return;
      }

      const userId = userResult.rows[0].id;

      // Get ALL currencies with user's balance
      const balancesResult = await pool.query(
        `SELECT
          c.id,
          c.code,
          c.name,
          c.symbol,
          c.is_active,
          COALESCE(ue.balance, 0) as balance
         FROM currencies c
         LEFT JOIN user_economy ue ON c.id = ue.currency_id AND ue.user_id = $1
         WHERE c.is_active = true
         ORDER BY c.is_default DESC, c.id ASC`,
        [userId]
      );

      if (balancesResult.rows.length === 0) {
        await interaction.editReply({
          content: '❌ No active currencies found in the system.',
        });
        return;
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${isSelf ? '💰 Your Wallet' : `💰 ${targetUser.username}'s Wallet`}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription('Here are all available currencies:')
        .setTimestamp()
        .setFooter({ text: 'WhiteCat Hosting Bot' });

      // Add each currency as a field
      for (const currency of balancesResult.rows) {
        const balance = parseInt(currency.balance) || 0;
        const symbol = currency.symbol || '💰';

        embed.addFields({
          name: `${symbol} ${currency.name}`,
          value: `**${balance.toLocaleString()}** ${currency.code}`,
          inline: true,
        });
      }

      // Add info footer if viewing own balance
      if (isSelf && balancesResult.rows.length > 0) {
        const totalCurrencies = balancesResult.rows.length;
        embed.addFields({
          name: '💡 Info',
          value: `You have ${totalCurrencies} ${totalCurrencies === 1 ? 'currency' : 'currencies'} in your wallet.\nUse \`/pay\` to send coins to others.`,
          inline: false,
        });
      }

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

export default command;
