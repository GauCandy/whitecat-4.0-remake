import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, Guild } from 'discord.js';
import { HybridCommand } from '../../types/command';
import { guildService } from '../../services/guild.service';

const command: HybridCommand = {
  // Slash command configuration
  slashData: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get information about the server'),

  // Prefix command configuration
  prefixData: {
    name: 'serverinfo',
    description: 'Get information about the server',
    aliases: ['si', 'server', 'guildinfo'],
    usage: 'serverinfo',
    category: 'info',
  },

  // Slash command execution
  async executeSlash(interaction: ChatInputCommandInteraction) {
    const { guild } = interaction;

    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
      return;
    }

    const embed = await buildServerInfoEmbed(guild, interaction.user.username);
    await interaction.reply({ embeds: [embed] });
  },

  // Prefix command execution
  async executePrefix(message: Message) {
    const { guild } = message;

    if (!guild) {
      await message.reply('This command can only be used in a server!');
      return;
    }

    const embed = await buildServerInfoEmbed(guild, message.author.username);
    await message.reply({ embeds: [embed] });
  },
};

/**
 * Build server info embed
 * Shared function to avoid code duplication between slash and prefix commands
 */
async function buildServerInfoEmbed(guild: Guild, requesterName: string): Promise<EmbedBuilder> {
  // Get guild info from service (with caching)
  const guildInfo = await guildService.getGuildInfo(guild);
  const memberStats = await guildService.getMemberStats(guild);
  const channelStats = guildService.getChannelStats(guild);
  const roleStats = guildService.getRoleStats(guild);
  const boostProgress = guildService.getBoostProgress(guild);
  const features = guildService.getFormattedFeatures(guild);
  const guildAge = guildService.getGuildAge(guild);

  const owner = await guild.fetchOwner();

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Server Information')
    .setThumbnail(guildInfo.icon || '')
    .addFields(
      { name: 'Server Name', value: guild.name, inline: true },
      { name: 'Server ID', value: guildInfo.id, inline: true },
      { name: 'Owner', value: owner.user.tag, inline: true },
      { name: 'Created', value: guildService.formatGuildCreation(guild), inline: false },
      { name: 'Server Age', value: `${guildAge} days`, inline: true },
      { name: 'Verification Level', value: guildService.getVerificationLevel(guild), inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      {
        name: 'Members',
        value: `Total: ${memberStats.total}\n👤 Humans: ${memberStats.humans}\n🤖 Bots: ${memberStats.bots}\n🟢 Online: ${memberStats.online}`,
        inline: true
      },
      {
        name: 'Channels',
        value: `Total: ${channelStats.total}\n💬 Text: ${channelStats.text}\n🔊 Voice: ${channelStats.voice}\n📁 Categories: ${channelStats.categories}`,
        inline: true
      },
      {
        name: 'Roles',
        value: `Total: ${roleStats.total}\n📌 Hoisted: ${roleStats.hoisted}\n🔧 Managed: ${roleStats.managed}`,
        inline: true
      },
      {
        name: 'Boost Status',
        value: `${guildService.getBoostLevel(guild)}\n💎 Boosts: ${boostProgress.current}\n${boostProgress.level < 3 ? `📊 Next Level: ${boostProgress.remaining} more` : '✨ Max Level!'}`,
        inline: true
      },
      {
        name: 'Content',
        value: `😀 Emojis: ${guildInfo.emojiCount}\n🎨 Stickers: ${guildInfo.stickerCount}`,
        inline: true
      }
    );

  // Add features if any
  if (features.length > 0) {
    embed.addFields({
      name: 'Server Features',
      value: features.slice(0, 10).join('\n') + (features.length > 10 ? `\n... and ${features.length - 10} more` : ''),
      inline: false
    });
  }

  // Add banner if exists
  if (guildInfo.banner) {
    embed.setImage(guildInfo.banner);
  }

  embed
    .setFooter({ text: `Requested by ${requesterName}` })
    .setTimestamp();

  return embed;
}

export default command;
