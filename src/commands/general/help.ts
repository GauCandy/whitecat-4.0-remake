import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';

const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị hướng dẫn sử dụng bot'),

  // KHÔNG yêu cầu đồng ý điều khoản - ai cũng có thể xem help
  requireTerms: false,

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle('📖 Hướng Dẫn Sử Dụng WhiteCat Bot')
      .setDescription(
        'WhiteCat là một Discord bot hiện đại được xây dựng với TypeScript và PostgreSQL.\n\n' +
        '**Lưu ý quan trọng:**\n' +
        'Hầu hết các lệnh yêu cầu bạn phải đồng ý với điều khoản sử dụng trước khi có thể sử dụng.'
      )
      .addFields(
        {
          name: '📋 Điều khoản sử dụng',
          value:
            '`/terms` - Xem điều khoản sử dụng\n' +
            '`/terms agree` - Đồng ý với điều khoản\n' +
            '`/terms status` - Kiểm tra trạng thái đồng ý',
        },
        {
          name: '🎯 Lệnh cơ bản',
          value:
            '`/help` - Hiển thị menu help này (không cần đồng ý điều khoản)\n' +
            '`/ping` - Kiểm tra độ trễ của bot (cần đồng ý điều khoản)',
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
      ephemeral: true,
    });
  },
};

export default helpCommand;
