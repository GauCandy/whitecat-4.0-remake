import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';
import { nekosService } from '../../services/nekos.service';
import { localeService } from '../../services/locale.service';

const kickCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick someone')
    
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The person to kick')
        
        .setRequired(true)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .setDMPermission(true),

  verificationLevel: 'basic',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('target', true);

    // Check if target is self
    if (target.id === interaction.user.id) {
      const message = await localeService.tGuild(
        interaction.guildId,
        'commands.fun.kick.self',
        { user: interaction.user.toString() }
      );
      await interaction.reply({ content: message });
      return;
    }

    // Check if target is bot
    if (target.id === interaction.client.user.id) {
      const message = await localeService.tGuild(
        interaction.guildId,
        'commands.fun.kick.bot',
        { user: interaction.user.toString() }
      );
      await interaction.reply({ content: message });
      return;
    }

    try {
      const gifUrl = await nekosService.getRandomGif('kick');
      const message = await localeService.tGuild(
        interaction.guildId,
        'commands.fun.kick.message',
        {
          user: interaction.user.toString(),
          target: target.toString()
        }
      );

      const embed = new EmbedBuilder()
        .setColor(0xFF6347)
        .setDescription(message)
        .setImage(gifUrl)
        .setFooter({ text: 'Powered by nekos.best' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      const errorMsg = await localeService.tGuild(interaction.guildId, 'commands.fun.error');
      await interaction.reply({
        content: errorMsg,
        ephemeral: true,
      });
    }
  },
};

export default kickCommand;
