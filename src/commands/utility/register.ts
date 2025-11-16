import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pterodactyl } from '../../utils/pterodactyl';
import { pool } from '../../database/config';
import { generatePassword } from '../../utils/password';

const STARTING_BALANCE = 100000; // 100,000 coins starting balance

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register for a hosting account and receive starting coins'),

  category: CommandCategory.Utility,
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
          // Check user economy
          const economyResult = await pool.query(
            'SELECT coins FROM user_economy WHERE user_id = $1',
            [userId]
          );

          const coins = economyResult.rows.length > 0 ? economyResult.rows[0].coins : 0;

          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ Already Registered')
            .setDescription('You already have a hosting account registered!')
            .addFields(
              { name: '👤 Username', value: pteroUser.username, inline: true },
              { name: '📧 Email', value: pteroUser.email, inline: true },
              { name: '💰 Balance', value: `${coins.toLocaleString()} coins`, inline: true },
              { name: '🆔 Pterodactyl ID', value: `#${pteroUser.id}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'WhiteCat Hosting Bot' });

          await interaction.editReply({ embeds: [embed] });
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
        await pool.query(
          `INSERT INTO user_economy (user_id, coins)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, STARTING_BALANCE]
        );

        const economyResult = await pool.query(
          'SELECT coins FROM user_economy WHERE user_id = $1',
          [userId]
        );

        const coins = economyResult.rows[0].coins;

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Account Linked Successfully')
          .setDescription('Your existing Pterodactyl account has been linked to your Discord account!')
          .addFields(
            { name: '👤 Username', value: pteroUser.username, inline: true },
            { name: '📧 Email', value: pteroUser.email, inline: true },
            { name: '🆔 Pterodactyl ID', value: `#${pteroUser.id}`, inline: true },
            { name: '💰 Starting Balance', value: `${coins.toLocaleString()} coins`, inline: true },
            {
              name: '📝 Next Steps',
              value: '• Use `/profile` to view your account details\n• Use `/balance` to check your coins\n• Purchase hosting with `/packages` command!',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create new Pterodactyl account
      const username = interaction.user.id; // Use Discord ID as username

      // Parse Discord username and discriminator
      // For new username system (no discriminator), it will be #0
      // For old system like "gaucandy#7322", split by #
      let firstName: string;
      let lastName: string;

      if (dbUser.discriminator && dbUser.discriminator !== '0') {
        // Old system: username#discriminator
        firstName = dbUser.username;
        lastName = `#${dbUser.discriminator}`;
      } else {
        // New system: just username
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
      await pool.query(
        `INSERT INTO user_economy (user_id, coins)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, STARTING_BALANCE]
      );

      // Send login credentials via DM
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🎉 Welcome to WhiteCat Hosting!')
          .setDescription('Your hosting account has been created successfully! Here are your login credentials:')
          .addFields(
            { name: '🌐 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false },
            { name: '👤 Username', value: `\`${newPteroUser.username}\``, inline: true },
            { name: '📧 Email', value: `\`${newPteroUser.email}\``, inline: true },
            { name: '🔑 Password', value: `\`${password}\``, inline: false },
            { name: '💰 Starting Balance', value: `${STARTING_BALANCE.toLocaleString()} coins`, inline: false },
            {
              name: '⚠️ Important',
              value: '• Please change your password after first login\n• Keep these credentials safe\n• Do not share your password with anyone',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.user.send({ embeds: [dmEmbed] });

        // Reply in channel (without password)
        const channelEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Registration Successful!')
          .setDescription('Your hosting account has been created successfully!\n\n📬 **Login credentials have been sent to your DM!**')
          .addFields(
            { name: '🆔 User ID', value: `#${newPteroUser.id}`, inline: true },
            { name: '👤 Username', value: newPteroUser.username, inline: true },
            { name: '💰 Starting Balance', value: `${STARTING_BALANCE.toLocaleString()} coins`, inline: true },
            {
              name: '📝 Next Steps',
              value: '1. ✅ Check your DMs for login credentials\n2. 🔐 Login to the panel and change your password\n3. 👤 Use `/profile` to view your account\n4. 💰 Use `/balance` to check your coins\n5. 🛒 Purchase hosting with `/packages` command!',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.editReply({ embeds: [channelEmbed] });
      } catch (dmError) {
        // If DM fails, show password in ephemeral message (fallback)
        const fallbackEmbed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('⚠️ Registration Successful (DM Failed)')
          .setDescription('Your account was created, but I couldn\'t send you a DM. Here are your credentials:')
          .addFields(
            { name: '🌐 Panel URL', value: process.env.PTERODACTYL_URL || 'N/A', inline: false },
            { name: '👤 Username', value: `\`${newPteroUser.username}\``, inline: true },
            { name: '📧 Email', value: `\`${newPteroUser.email}\``, inline: true },
            { name: '🔑 Password', value: `\`${password}\``, inline: false },
            { name: '💰 Starting Balance', value: `${STARTING_BALANCE.toLocaleString()} coins`, inline: false },
            {
              name: '⚠️ Important',
              value: '• Enable DMs from server members to receive credentials safely next time\n• Change your password after first login\n• **Delete this message after copying your credentials!**',
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({ text: 'WhiteCat Hosting Bot' });

        await interaction.editReply({ embeds: [fallbackEmbed] });
      }
    } catch (error) {
      console.error('Error in /register command:', error);

      let errorMessage = '❌ Failed to create hosting account. Please try again later.';

      if (error instanceof Error) {
        errorMessage += `\n\n**Error:** ${error.message}`;
      }

      await interaction.editReply({ content: errorMessage });
    }
  },
};

export default command;
