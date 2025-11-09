import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';
import Logger from '../../utils/logger';

const clearCommandsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('clearcommands')
    .setDescription('Clear registered slash commands')
    .setDescriptionLocalizations({
      vi: 'Xóa các slash commands đã đăng ký',
    })
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('Where to clear commands')
        .setDescriptionLocalizations({ vi: 'Phạm vi xóa commands' })
        .setRequired(true)
        .addChoices(
          { name: 'This Server (Guild)', value: 'guild' },
          { name: 'Global (All Servers)', value: 'global' }
        )
    )
    .setDMPermission(false),

  verificationLevel: 'basic',
  ownerOnly: true, // Only bot owner can use this

  async execute(interaction: ChatInputCommandInteraction) {
    const scope = interaction.options.getString('scope', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      if (scope === 'guild') {
        // Clear guild commands
        if (!interaction.guildId) {
          await interaction.editReply('❌ This command must be used in a server!');
          return;
        }

        const guildCommands = await interaction.client.application?.commands.fetch({ guildId: interaction.guildId });

        if (!guildCommands || guildCommands.size === 0) {
          await interaction.editReply('✅ No guild commands to clear!');
          return;
        }

        // Delete all guild commands
        await interaction.guild?.commands.set([]);

        Logger.success(`Cleared ${guildCommands.size} guild commands for ${interaction.guild?.name}`);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Guild Commands Cleared')
          .setDescription(`Successfully cleared **${guildCommands.size}** slash commands from this server.`)
          .addFields(
            { name: 'Server', value: interaction.guild?.name || 'Unknown', inline: true },
            { name: 'Commands Cleared', value: guildCommands.size.toString(), inline: true }
          )
          .setFooter({ text: 'Commands will be re-registered on next bot restart' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (scope === 'global') {
        // Clear global commands
        const globalCommands = await interaction.client.application?.commands.fetch();

        if (!globalCommands || globalCommands.size === 0) {
          await interaction.editReply('✅ No global commands to clear!');
          return;
        }

        // Delete all global commands
        await interaction.client.application?.commands.set([]);

        Logger.success(`Cleared ${globalCommands.size} global commands`);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Global Commands Cleared')
          .setDescription(`Successfully cleared **${globalCommands.size}** global slash commands.`)
          .addFields(
            { name: 'Scope', value: 'Global (All Servers)', inline: true },
            { name: 'Commands Cleared', value: globalCommands.size.toString(), inline: true }
          )
          .setFooter({ text: 'Commands will be re-registered on next bot restart' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      Logger.error('Error clearing commands', error);
      await interaction.editReply({
        content: '❌ Failed to clear commands. Check logs for details.',
      });
    }
  },
};

export default clearCommandsCommand;
