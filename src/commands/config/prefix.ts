import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import type { Command } from '../../types/command';
import { CommandCategory } from '../../types/command';
import { pool } from '../../database/config';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Change the bot prefix for this server')
    .addStringOption((option) =>
      option
        .setName('prefix')
        .setDescription('New prefix (1-5 characters)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(5)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  category: CommandCategory.Config,
  cooldown: 5,
  requiresAuth: false, // Public command for admins

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const newPrefix = interaction.options.getString('prefix', true);

    try {
      // Update or insert guild prefix
      await pool.query(
        `INSERT INTO guilds (guild_id, prefix)
         VALUES ($1, $2)
         ON CONFLICT (guild_id)
         DO UPDATE SET prefix = $2`,
        [interaction.guild.id, newPrefix]
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Prefix Updated')
        .setDescription(`The bot prefix has been changed to: \`${newPrefix}\``)
        .addFields(
          { name: 'Example', value: `Try using \`${newPrefix}ping\` to test!`, inline: false },
          { name: 'Changed by', value: interaction.user.tag, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'WhiteCat Hosting Bot' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error updating prefix:', error);

      await interaction.reply({
        content: '❌ Failed to update prefix. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
