import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),

  category: CommandCategory.Utility,
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({
      content: '🏓 Pinging...',
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(apiLatency < 100 ? '#00FF00' : apiLatency < 200 ? '#FFA500' : '#FF0000')
      .setTitle('🏓 Pong!')
      .setDescription('Bot performance metrics')
      .addFields(
        { name: '📡 Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: '🌐 API Latency', value: `\`${apiLatency}ms\``, inline: true },
        {
          name: '📊 Status',
          value: apiLatency < 100 ? '✅ Excellent' : apiLatency < 200 ? '⚠️ Good' : '❌ Poor',
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: 'WhiteCat Hosting Bot' });

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};

export default command;
