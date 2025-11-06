import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import { HybridCommand } from '../../types/command';

const command: HybridCommand = {
  // Slash command configuration
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and shows bot latency'),

  // Prefix command configuration
  prefixData: {
    name: 'ping',
    description: 'Replies with Pong and shows bot latency',
    aliases: ['p', 'pong'],
    usage: 'ping',
    category: 'utility',
  },

  // Slash command execution
  async executeSlash(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n` +
      `📡 Latency: ${latency}ms\n` +
      `💓 API Latency: ${apiLatency}ms`
    );
  },

  // Prefix command execution
  async executePrefix(message: Message) {
    const sent = await message.reply('Pinging...');

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    await sent.edit(
      `🏓 Pong!\n` +
      `📡 Latency: ${latency}ms\n` +
      `💓 API Latency: ${apiLatency}ms`
    );
  },
};

export default command;
