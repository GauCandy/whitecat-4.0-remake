import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';

const listCommandsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('listcommands')
    .setDescription('List all registered slash commands')
    .setDescriptionLocalizations({
      vi: 'Liệt kê tất cả slash commands đã đăng ký',
    })
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('Where to list commands')
        .setDescriptionLocalizations({ vi: 'Phạm vi liệt kê commands' })
        .setRequired(true)
        .addChoices(
          { name: 'This Server (Guild)', value: 'guild' },
          { name: 'Global (All Servers)', value: 'global' }
        )
    )
    .setDMPermission(false),

  verificationLevel: 'basic',
  ownerOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const scope = interaction.options.getString('scope', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      if (scope === 'guild') {
        if (!interaction.guildId) {
          await interaction.editReply('❌ This command must be used in a server!');
          return;
        }

        const guildCommands = await interaction.client.application?.commands.fetch({ guildId: interaction.guildId });

        if (!guildCommands || guildCommands.size === 0) {
          await interaction.editReply('📋 No guild commands registered.');
          return;
        }

        const commandList = guildCommands.map(cmd => `• \`/${cmd.name}\` - ${cmd.description}`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setTitle('📋 Guild Commands')
          .setDescription(commandList)
          .addFields(
            { name: 'Server', value: interaction.guild?.name || 'Unknown', inline: true },
            { name: 'Total', value: guildCommands.size.toString(), inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (scope === 'global') {
        const globalCommands = await interaction.client.application?.commands.fetch();

        if (!globalCommands || globalCommands.size === 0) {
          await interaction.editReply('📋 No global commands registered.');
          return;
        }

        const commandList = globalCommands.map(cmd => `• \`/${cmd.name}\` - ${cmd.description}`).join('\n');

        // Split if too long (Discord embed description limit: 4096 chars)
        const chunks: string[] = [];
        let currentChunk = '';

        for (const line of commandList.split('\n')) {
          if ((currentChunk + line + '\n').length > 4000) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setTitle('📋 Global Commands')
          .setDescription(chunks[0])
          .addFields(
            { name: 'Scope', value: 'Global (All Servers)', inline: true },
            { name: 'Total', value: globalCommands.size.toString(), inline: true }
          )
          .setTimestamp();

        if (chunks.length > 1) {
          embed.setFooter({ text: `Showing ${chunks[0].split('\n').length}/${globalCommands.size} commands` });
        }

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      await interaction.editReply({
        content: '❌ Failed to fetch commands. Check permissions.',
      });
    }
  },
};

export default listCommandsCommand;
