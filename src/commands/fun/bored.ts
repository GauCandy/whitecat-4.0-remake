/**
 * Bored Expression Command
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { Command, CommandCategory } from '../../types';
import { getNekobest, NekobestExpression } from '../../utils/nekobest';
import { getGuildLocale, t, Locale, buildLocalizedCommand } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: Command = {
    data: buildLocalizedCommand('bored', 'fun')
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel) as SlashCommandBuilder,

    category: CommandCategory.Fun,
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const guildId = interaction.guildId;

            // Get guild locale for translations
            const locale = guildId ? await getGuildLocale(guildId) : Locale.English;

            // Defer reply as API call might take a moment
            await interaction.deferReply();

            // Fetch GIF from Nekobest API
            const gifUrl = await getNekobest(NekobestExpression.Bored);

            // Get random message from array
            const messages = t(locale, 'commands.fun.bored.message');
            const message = Array.isArray(messages)
                ? messages[Math.floor(Math.random() * messages.length)]
                : messages;

            // Create embed with the expression
            const embed = new EmbedBuilder()
                .setColor('#FFB300')
                .setDescription(
                    message.replace('{user}', `**${interaction.user.username}**`)
                )
                .setImage(gifUrl)
                .setFooter({
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error in bored command:', error);

            const errorMessage = t(Locale.English, 'commands.fun.error');

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage, embeds: [] });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

export default command;
