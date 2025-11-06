import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get information about the server'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = interaction;

    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Server Information')
      .setThumbnail(guild.iconURL({ size: 256 }) || '')
      .addFields(
        { name: 'Server Name', value: guild.name, inline: true },
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false },
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
        { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: 'Boost Count', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
