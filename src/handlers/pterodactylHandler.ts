import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} from 'discord.js';
import { pterodactyl } from '../utils/pterodactyl';
import { pool } from '../database/config';
import { generatePassword } from '../utils/password';

/**
 * Handle Reset Password button click
 */
export async function handleResetPasswordButton(interaction: ButtonInteraction): Promise<void> {
  try {
    // Extract user ID from custom ID
    const userId = interaction.customId.split('_')[2];

    // Verify it's the correct user
    if (interaction.user.id !== userId) {
      await interaction.reply({
        content: '❌ This button is not for you!',
        ephemeral: true,
      });
      return;
    }

    // Create modal for password input
    const modal = new ModalBuilder()
      .setCustomId(`reset_password_modal_${userId}`)
      .setTitle('Reset Pterodactyl Password');

    const passwordInput = new TextInputBuilder()
      .setCustomId('new_password')
      .setLabel('New Password (leave empty for random)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Leave empty to generate random password')
      .setRequired(false)
      .setMinLength(8)
      .setMaxLength(32);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput);

    modal.addComponents(row);

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing reset password modal:', error);
    await interaction.reply({
      content: '❌ Failed to show password reset form.',
      ephemeral: true,
    });
  }
}

/**
 * Handle Reset Password modal submission
 */
export async function handleResetPasswordModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Extract user ID from custom ID
    const userId = interaction.customId.split('_')[3];

    // Verify it's the correct user
    if (interaction.user.id !== userId) {
      await interaction.editReply({
        content: '❌ This form is not for you!',
      });
      return;
    }

    // Get new password from modal (or generate random)
    const inputPassword = interaction.fields.getTextInputValue('new_password');
    const newPassword = inputPassword.trim() || generatePassword(16);

    // Get user from database
    const userResult = await pool.query(
      'SELECT pterodactyl_user_id FROM users WHERE discord_id = $1',
      [interaction.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].pterodactyl_user_id) {
      await interaction.editReply({
        content: '❌ Pterodactyl account not found!',
      });
      return;
    }

    const pteroUserId = userResult.rows[0].pterodactyl_user_id;

    // Update password on Pterodactyl panel
    // Note: Pterodactyl API doesn't have a direct "update password" endpoint
    // We need to use the updateUser endpoint
    await pterodactyl.updateUserPassword(pteroUserId, newPassword);

    // Send new password via DM with ping
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🔐 Password Reset Successful')
        .setDescription('Your Pterodactyl account password has been changed!')
        .addFields(
          { name: '🌐 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false },
          { name: '🔑 New Password', value: `\`${newPassword}\``, inline: false },
          {
            name: '⚠️ Important',
            value: '• This is your new login password\n• Save it in a safe place\n• Do not share it with anyone',
            inline: false
          }
        )
        .setTimestamp()
        .setFooter({ text: 'WhiteCat Hosting Bot' });

      await interaction.user.send({
        content: `${interaction.user} Your Pterodactyl account password has been reset!`,
        embeds: [dmEmbed],
      });

      // Confirm in ephemeral message
      await interaction.editReply({
        content: '✅ Password reset successfully! Check your DMs for the new password.',
      });
    } catch (dmError) {
      console.error('Failed to send DM:', dmError);

      // Fallback: show password in ephemeral message
      const fallbackEmbed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🔐 Password Reset Successful (DM Failed)')
        .setDescription('Your password was reset, but I couldn\'t send you a DM.')
        .addFields(
          { name: '🔑 New Password', value: `\`${newPassword}\``, inline: false },
          {
            name: '⚠️ Important',
            value: '• Enable DMs to receive passwords safely\n• **Copy this password and delete this message!**',
            inline: false
          }
        )
        .setTimestamp()
        .setFooter({ text: 'WhiteCat Hosting Bot' });

      await interaction.editReply({ embeds: [fallbackEmbed] });
    }
  } catch (error) {
    console.error('Error resetting password:', error);

    let errorMessage = '❌ Failed to reset password. Please try again later.';

    if (error instanceof Error) {
      errorMessage += `\n\n**Error:** ${error.message}`;
    }

    await interaction.editReply({ content: errorMessage });
  }
}
