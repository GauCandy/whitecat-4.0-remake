import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  User,
} from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { getUserIdFromDiscordId, getBalance, transferCoins } from '../../utils/economy';

const MIN_TRANSFER_AMOUNT = 100; // Minimum transfer: 100 coins
const MAX_TRANSFER_AMOUNT = 1000000; // Maximum transfer: 1,000,000 coins

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to send coins to')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of coins to send')
        .setRequired(true)
        .setMinValue(MIN_TRANSFER_AMOUNT)
        .setMaxValue(MAX_TRANSFER_AMOUNT)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Optional message to include with the payment')
        .setRequired(false)
        .setMaxLength(200)
    ),

  category: CommandCategory.Economy,
  cooldown: 5,
  requiresAuth: false, // Don't need auth to transfer coins

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const sender = interaction.user;
      const recipient: User = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const message = interaction.options.getString('message') || undefined;

      // Validation: Cannot send to self
      if (sender.id === recipient.id) {
        await interaction.editReply({
          content: '❌ You cannot send coins to yourself!',
        });
        return;
      }

      // Validation: Cannot send to bots
      if (recipient.bot) {
        await interaction.editReply({
          content: '❌ You cannot send coins to bots!',
        });
        return;
      }

      // Get sender's user ID
      const senderId = await getUserIdFromDiscordId(sender.id);
      if (!senderId) {
        await interaction.editReply({
          content: '❌ You are not registered! Use `/register` to create an account.',
        });
        return;
      }

      // Get recipient's user ID
      const recipientId = await getUserIdFromDiscordId(recipient.id);
      if (!recipientId) {
        await interaction.editReply({
          content: `❌ ${recipient.username} is not registered yet! They need to use \`/register\` first.`,
        });
        return;
      }

      // Check sender's balance
      const senderBalance = await getBalance(senderId);
      if (senderBalance === null) {
        await interaction.editReply({
          content: '❌ You don\'t have an economy account! Use `/register` to create one.',
        });
        return;
      }

      if (senderBalance < amount) {
        await interaction.editReply({
          content: `❌ Insufficient balance! You have **${senderBalance.toLocaleString()}** coins but need **${amount.toLocaleString()}** coins.`,
        });
        return;
      }

      // Check recipient has economy account
      const recipientBalance = await getBalance(recipientId);
      if (recipientBalance === null) {
        await interaction.editReply({
          content: `❌ ${recipient.username} doesn't have an economy account yet!`,
        });
        return;
      }

      // Execute transfer
      const description = message || `Payment from ${sender.username}`;
      const result = await transferCoins(senderId, recipientId, amount, description);

      if (!result.success) {
        await interaction.editReply({
          content: `❌ Transfer failed: ${result.error || 'Unknown error'}`,
        });
        return;
      }

      // Build success embed
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Payment Successful')
        .setDescription(
          `Successfully sent **${amount.toLocaleString()}** coins to ${recipient.username}!`
        )
        .addFields(
          {
            name: '📤 Sender',
            value: `${sender.username}\n**New Balance:** ${result.senderBalance.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: '📥 Recipient',
            value: `${recipient.username}\n**New Balance:** ${result.recipientBalance.toLocaleString()} coins`,
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({ text: 'WhiteCat Hosting Bot' });

      // Add message if provided
      if (message) {
        embed.addFields({
          name: '💬 Message',
          value: message,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });

      // Try to notify recipient via DM
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('💰 You Received Coins!')
          .setDescription(`${sender.username} sent you **${amount.toLocaleString()}** coins!`)
          .addFields(
            {
              name: '💵 Amount',
              value: `${amount.toLocaleString()} coins`,
              inline: true,
            },
            {
              name: '📊 New Balance',
              value: `${result.recipientBalance.toLocaleString()} coins`,
              inline: true,
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        if (message) {
          dmEmbed.addFields({
            name: '💬 Message',
            value: message,
            inline: false,
          });
        }

        await recipient.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        // Silently fail if DM fails (user might have DMs disabled)
        console.log(`Could not send DM notification to ${recipient.username}`);
      }
    } catch (error) {
      console.error('Error in /pay command:', error);

      let errorMessage = '❌ Failed to process payment. Please try again later.';

      if (error instanceof Error) {
        errorMessage += `\n\n**Error:** ${error.message}`;
      }

      await interaction.editReply({ content: errorMessage });
    }
  },
};

export default command;
