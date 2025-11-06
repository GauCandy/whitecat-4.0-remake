import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, User, GuildMember } from 'discord.js';
import { HybridCommand } from '../../types/command';
import { userService } from '../../services/user.service';

const command: HybridCommand = {
  // Slash command configuration
  slashData: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to get information about')
        .setRequired(false)
    ),

  // Prefix command configuration
  prefixData: {
    name: 'userinfo',
    description: 'Get information about a user',
    aliases: ['ui', 'whois', 'user'],
    usage: 'userinfo [@user]',
    category: 'info',
  },

  // Slash command execution
  async executeSlash(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = await buildUserInfoEmbed(targetUser, member, interaction.user.username);
    await interaction.reply({ embeds: [embed] });
  },

  // Prefix command execution
  async executePrefix(message: Message, args: string[]) {
    // Get target user from mention or use message author
    const targetUser = message.mentions.users.first() || message.author;
    const member = message.guild?.members.cache.get(targetUser.id);

    const embed = await buildUserInfoEmbed(targetUser, member, message.author.username);
    await message.reply({ embeds: [embed] });
  },
};

/**
 * Build user info embed
 * Shared function to avoid code duplication between slash and prefix commands
 */
async function buildUserInfoEmbed(
  targetUser: User,
  member: GuildMember | undefined,
  requesterName: string
): Promise<EmbedBuilder> {
  // Get user info from service (with caching)
  const userInfo = await userService.getUserInfo(targetUser, member);
  const badges = userService.getUserBadges(targetUser);
  const accountAge = userService.getUserAge(targetUser);

  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor || 0x0099FF)
    .setTitle('User Information')
    .setThumbnail(userInfo.avatar)
    .addFields(
      { name: 'Username', value: targetUser.username, inline: true },
      { name: 'User ID', value: userInfo.id, inline: true },
      { name: 'Bot', value: userInfo.bot ? 'Yes' : 'No', inline: true },
      { name: 'Account Created', value: userService.formatUserCreation(targetUser), inline: false },
      { name: 'Account Age', value: `${accountAge} days`, inline: true }
    );

  // Add badges if any
  if (badges.length > 0) {
    embed.addFields({ name: 'Badges', value: badges.join('\n'), inline: false });
  }

  // Add member-specific info if in guild
  if (member) {
    const memberAge = userService.getMemberAge(member);
    const topRoles = userService.getTopRoles(member, 5);
    const isAdmin = userService.isAdmin(member);
    const isMod = userService.isModerator(member);

    embed.addFields(
      { name: 'Joined Server', value: userService.formatMemberJoin(member), inline: false },
      { name: 'Server Member Age', value: `${memberAge} days`, inline: true },
      { name: 'Nickname', value: member.nickname || 'None', inline: true },
      { name: 'Top Roles', value: topRoles.join(', ') || 'None', inline: false }
    );

    if (isAdmin) {
      embed.addFields({ name: 'Permissions', value: '👑 Administrator', inline: true });
    } else if (isMod) {
      embed.addFields({ name: 'Permissions', value: '🛡️ Moderator', inline: true });
    }
  }

  embed
    .setFooter({ text: `Requested by ${requesterName}` })
    .setTimestamp();

  return embed;
}

export default command;
