import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to get information about')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('User Information')
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username', value: targetUser.username, inline: true },
        { name: 'User ID', value: targetUser.id, inline: true },
        { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: false }
      );

    if (member) {
      embed.addFields(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: false },
        { name: 'Roles', value: member.roles.cache.map(role => role.name).join(', ') || 'None', inline: false }
      );
    }

    embed.setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
