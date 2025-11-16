import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pterodactyl } from '../../utils/pterodactyl';
import { pool } from '../../database/config';
import { generatePassword } from '../../utils/password';
import { createEconomyAccount, DEFAULT_CURRENCY_ID } from '../../utils/economy';

const STARTING_BALANCE = 100000; // 100,000 coins starting balance

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pterodactyl')
    .setDescription('Manage your Pterodactyl hosting account'),

  category: CommandCategory.Hosting,
  cooldown: 10,
  requiresAuth: true, // Requires OAuth2 verification for email

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Get user from database
      const userResult = await pool.query(
        'SELECT id, discord_id, username, discriminator, email, pterodactyl_user_id FROM users WHERE discord_id = $1',
        [interaction.user.id]
      );

      if (userResult.rows.length === 0) {
        await interaction.editReply({
          content: '❌ User not found in database. Please try again.',
        });
        return;
      }

      const dbUser = userResult.rows[0];
      const userId = dbUser.id;

      // Check if user has email (from OAuth2 verification)
      if (!dbUser.email) {
        await interaction.editReply({
          content: '❌ You need to verify your email first! Please use `/verify` command.',
        });
        return;
      }

      // Check if user already has Pterodactyl account linked
      if (dbUser.pterodactyl_user_id) {
        const pteroUser = await pterodactyl.getUserById(dbUser.pterodactyl_user_id);

        if (pteroUser) {
          // Show profile with Reset Password button
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎮 Pterodactyl Account')
            .setDescription('Your hosting account details:')
            .addFields(
              { name: '👤 Username', value: pteroUser.username, inline: true },
              { name: '📧 Email', value: pteroUser.email, inline: true },
              { name: '🆔 User ID', value: `#${pteroUser.id}`, inline: true },
              { name: '🔗 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'WhiteCat Hosting Bot' });

          const resetButton = new ButtonBuilder()
            .setCustomId(`reset_password_${interaction.user.id}`)
            .setLabel('🔐 Reset Password')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resetButton);

          await interaction.editReply({ embeds: [embed], components: [row] });
          return;
        }
      }

      // Check if Pterodactyl account exists by external_id (Discord ID)
      let pteroUser = await pterodactyl.getUserByExternalId(interaction.user.id);

      // If not found by external_id, check by email
      if (!pteroUser) {
        pteroUser = await pterodactyl.getUserByEmail(dbUser.email);
      }

      // If account exists, link it
      if (pteroUser) {
        await pool.query(
          'UPDATE users SET pterodactyl_user_id = $1, updated_at = NOW() WHERE discord_id = $2',
          [pteroUser.id, interaction.user.id]
        );

        // Create user economy if not exists
        await createEconomyAccount(userId, STARTING_BALANCE, DEFAULT_CURRENCY_ID);

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Account Linked Successfully')
          .setDescription('Your existing Pterodactyl account has been linked!')
          .addFields(
            { name: '👤 Username', value: pteroUser.username, inline: true },
            { name: '📧 Email', value: pteroUser.email, inline: true },
            { name: '🆔 User ID', value: `#${pteroUser.id}`, inline: true },
            { name: '🔗 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        const resetButton = new ButtonBuilder()
          .setCustomId(`reset_password_${interaction.user.id}`)
          .setLabel('🔐 Reset Password')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resetButton);

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      // Create new Pterodactyl account
      const username = interaction.user.id; // Use Discord ID as username

      // Parse Discord username and discriminator
      let firstName: string;
      let lastName: string;

      if (dbUser.discriminator && dbUser.discriminator !== '0') {
        firstName = dbUser.username;
        lastName = `#${dbUser.discriminator}`;
      } else {
        firstName = dbUser.username;
        lastName = '#0';
      }

      // Generate random password
      const password = generatePassword(16);

      // Create Pterodactyl user
      const newPteroUser = await pterodactyl.createUser({
        email: dbUser.email,
        username: username,
        first_name: firstName,
        last_name: lastName,
        password: password,
        external_id: interaction.user.id,
      });

      // Save Pterodactyl user ID to database
      await pool.query(
        'UPDATE users SET pterodactyl_user_id = $1, updated_at = NOW() WHERE discord_id = $2',
        [newPteroUser.id, interaction.user.id]
      );

      // Create user economy with starting balance
      await createEconomyAccount(userId, STARTING_BALANCE, DEFAULT_CURRENCY_ID);

      // Send login credentials via DM
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🎉 Welcome to WhiteCat Hosting!')
          .setDescription('Your hosting account has been created successfully!')
          .addFields(
            { name: '🌐 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false },
            { name: '👤 Username', value: `\`${newPteroUser.username}\``, inline: true },
            { name: '📧 Email', value: `\`${newPteroUser.email}\``, inline: true },
            { name: '🔑 Password', value: `\`${password}\``, inline: false },
            {
              name: '⚠️ Important',
              value: '• Change your password after first login\n• Keep these credentials safe\n• Do not share your password',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.user.send({ content: `${interaction.user}`, embeds: [dmEmbed] });

        // Reply in channel (without password)
        const channelEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Account Created Successfully')
          .setDescription('Your Pterodactyl hosting account has been created!\n\n📬 **Login credentials have been sent to your DM!**')
          .addFields(
            { name: '🆔 User ID', value: `#${newPteroUser.id}`, inline: true },
            { name: '👤 Username', value: newPteroUser.username, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        const resetButton = new ButtonBuilder()
          .setCustomId(`reset_password_${interaction.user.id}`)
          .setLabel('🔐 Reset Password')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resetButton);

        await interaction.editReply({ embeds: [channelEmbed], components: [row] });
      } catch (dmError) {
        // If DM fails, show password in ephemeral message
        const fallbackEmbed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('⚠️ Account Created (DM Failed)')
          .setDescription('Your account was created, but I couldn\'t send you a DM.')
          .addFields(
            { name: '🌐 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false },
            { name: '👤 Username', value: `\`${newPteroUser.username}\``, inline: true },
            { name: '📧 Email', value: `\`${newPteroUser.email}\``, inline: true },
            { name: '🔑 Password', value: `\`${password}\``, inline: false },
            {
              name: '⚠️ Important',
              value: '• Enable DMs to receive credentials safely\n• **Delete this message after copying!**',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.editReply({ embeds: [fallbackEmbed] });
      }
    } catch (error) {
      console.error('Error in /pterodactyl command:', error);

      let errorMessage = '❌ Failed to manage Pterodactyl account. Please try again later.';

      if (error instanceof Error) {
        errorMessage += `\n\n**Error:** ${error.message}`;
      }

      await interaction.editReply({ content: errorMessage });
    }
  },
};

export default command;
