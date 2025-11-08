import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { SlashCommand } from '../../types/command';

const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị hướng dẫn sử dụng bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle('📖 Hướng Dẫn Sử Dụng WhiteCat Bot')
      .setDescription(
        'WhiteCat là một Discord bot hiện đại được xây dựng với TypeScript và PostgreSQL.\n\n' +
        '**Hệ thống xác thực 2 cấp:**\n' +
        '• **Basic:** Chỉ cần đồng ý điều khoản (cho lệnh cơ bản)\n' +
        '• **Verified:** Cần xác thực email qua OAuth (cho lệnh nâng cao)'
      )
      .addFields(
        {
          name: '🎯 Lệnh cơ bản (Basic)',
          value:
            '`/help` - Hiển thị menu help này\n' +
            '`/ping` - Kiểm tra độ trễ của bot',
        },
        {
          name: '🔐 Lệnh nâng cao (Verified)',
          value:
            'Các lệnh nâng cao yêu cầu xác thực email qua Discord OAuth.\n' +
            'Sẽ được bổ sung trong các phiên bản sau.',
        },
        {
          name: '📊 Trạng thái bot',
          value:
            '**API:** Đang hoạt động\n' +
            '**Database:** Đang kết nối\n' +
            '**Version:** 1.0.0',
        }
      )
      .setFooter({
        text: 'Tạo bởi Gấu Kẹo (GauCandy)',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default helpCommand;
