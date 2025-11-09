import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';
import { nekosService } from '../../services/nekos.service';
import { localeService } from '../../services/locale.service';

const bakaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('baka')
    .setDescription('Call someone baka!')
    
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .setDMPermission(true),

  verificationLevel: 'basic',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const gifUrl = await nekosService.getRandomGif('baka');
      const message = await localeService.tGuild(
        interaction.guildId,
        'commands.fun.baka.message',
        { user: interaction.user.toString() }
      );

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
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

export default bakaCommand;
