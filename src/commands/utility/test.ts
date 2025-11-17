import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test command to verify applications.commands scope')
    .setIntegrationTypes(0, 1) // 0 = GUILD_INSTALL, 1 = USER_INSTALL
    .setContexts(0, 1, 2), // 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEL

  category: CommandCategory.Utility,
  cooldown: 3,
  // requiresAuth defaults to true - requires identify + applications.commands + email scopes

  async execute(interaction) {
    // Determine where the command was executed
    let location = '❓ Unknown';
    let locationDetails = '';

    if (interaction.inGuild()) {
      // Command used in a server
      const guild = interaction.guild;
      const botIsMember = guild?.members.cache.has(interaction.client.user.id);

      if (botIsMember) {
        location = '🏰 Server (Bot is a member)';
        locationDetails = `Server: **${guild?.name}**\nBot is installed in this server`;
      } else {
        location = '🏰 Server (Bot NOT a member)';
        locationDetails = `Server: **${guild?.name}**\n⚠️ Bot is NOT installed, but command works via user install!`;
      }
    } else {
      // Command used in DMs or Private Channels (not in a guild)
      location = '💬 Direct Message / Private Channel';
      locationDetails = 'Command executed in DMs or group DM via user install';
    }

    // Get user info
    const user = interaction.user;

    // Build response embed
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Test Command Success!')
      .setDescription(
        'This command is working correctly with `applications.commands` scope!\n\n' +
          'You can use this command in:\n' +
          '• Servers where the bot is installed\n' +
          '• Servers where the bot is NOT installed (via user install)\n' +
          '• Direct Messages'
      )
      .addFields(
        {
          name: '📍 Current Location',
          value: location,
          inline: false,
        },
        {
          name: '📋 Details',
          value: locationDetails || 'No additional details',
          inline: false,
        },
        {
          name: '👤 User Info',
          value: `Username: **${user.username}**\nUser ID: \`${user.id}\``,
          inline: false,
        },
        {
          name: '🔑 Authorization Status',
          value: '✅ Authorized (terms accepted via OAuth)',
          inline: false,
        }
      )
      .setFooter({
        text: 'WhiteCat Bot - User Install Test',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
