import { EmbedBuilder, Message } from 'discord.js';
import type { TextCommand } from '../../types/textCommand';
import { CommandCategory } from '../../types/command';

const command: TextCommand = {
  name: 'ping',
  aliases: ['pong', 'latency'],
  description: 'Check bot latency and response time',
  usage: 'ping',
  category: CommandCategory.Utility,
  cooldown: 5,
  requiresAuth: false, // Public command

  async execute(message: Message): Promise<void> {
    const sent = await message.reply('🏓 Pinging...');

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    // Determine latency quality
    let latencyEmoji = '🟢';
    let latencyColor = 0x57f287; // Green

    if (apiLatency > 200 || latency > 500) {
      latencyEmoji = '🟡';
      latencyColor = 0xfee75c; // Yellow
    }

    if (apiLatency > 500 || latency > 1000) {
      latencyEmoji = '🔴';
      latencyColor = 0xed4245; // Red
    }

    const embed = new EmbedBuilder()
      .setColor(latencyColor)
      .setTitle(`${latencyEmoji} Pong!`)
      .setDescription('Bot performance metrics')
      .addFields(
        { name: '🤖 Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: '📡 API Latency', value: `\`${apiLatency}ms\``, inline: true },
        {
          name: '📊 Status',
          value: apiLatency < 100 ? '✅ Excellent' : apiLatency < 200 ? '⚠️ Good' : '❌ Poor',
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await sent.edit({ content: '', embeds: [embed] });
  },
};

export default command;
