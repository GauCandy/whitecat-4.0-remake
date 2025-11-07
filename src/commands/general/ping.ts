import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),

  // Mặc định yêu cầu đồng ý điều khoản (không cần khai báo requireTerms: true)

  async execute(interaction: ChatInputCommandInteraction) {
    // Measure API latency
    const sent = await interaction.deferReply({ fetchReply: true });
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

    // Get WebSocket ping
    const wsPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(wsPing < 100 ? 0x00FF00 : wsPing < 200 ? 0xFFFF00 : 0xFF0000)
      .setTitle('🏓 Pong!')
      .addFields(
        {
          name: '📡 WebSocket Ping',
          value: `\`${wsPing}ms\``,
          inline: true,
        },
        {
          name: '⚡ API Latency',
          value: `\`${apiLatency}ms\``,
          inline: true,
        },
        {
          name: '📊 Status',
          value: wsPing < 100 ? '✅ Excellent' : wsPing < 200 ? '⚠️ Good' : '❌ Poor',
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};

export default pingCommand;
