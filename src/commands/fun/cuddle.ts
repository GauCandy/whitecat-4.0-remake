/**
 * Cuddle Action Command
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { Command, CommandCategory } from '../../types';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale, buildLocalizedCommand } from '../../utils/i18n';
import logger from '../../utils/logger';

const command: Command = {
    data: buildLocalizedCommand('cuddle', 'fun')
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to perform this action on')
                .setDescriptionLocalizations({
                    vi: 'Người dùng để thực hiện hành động này',
                })
                .setRequired(true)
        ) as SlashCommandBuilder,

    category: CommandCategory.Fun,
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const targetUser = interaction.options.getUser('user', true);
            const guildId = interaction.guildId;

            // Get guild locale for translations
            const locale = guildId ? await getGuildLocale(guildId) : Locale.EnglishUS;

            // Check if targeting bot
            const isBot = targetUser.id === interaction.client.user.id;

            // Prevent self-targeting
            if (targetUser.id === interaction.user.id) {
                const selfMessages = t(locale, 'commands.fun.cuddle.self');
                const message = Array.isArray(selfMessages)
                    ? selfMessages[Math.floor(Math.random() * selfMessages.length)]
                    : selfMessages;

                await interaction.reply({
                    content: message.replace('{user}', `**${interaction.user.username}**`),
                    ephemeral: true
                });
                return;
            }

            // Defer reply as API call might take a moment
            await interaction.deferReply();

            // Fetch GIF from Nekobest API
            const gifUrl = await getNekobest(NekobestAction.Cuddle);

            // Get message (handle bot case or normal)
            const messageKey = isBot ? 'commands.fun.cuddle.bot' : 'commands.fun.cuddle.message';
            const messages = t(locale, messageKey);
            const message = Array.isArray(messages)
                ? messages[Math.floor(Math.random() * messages.length)]
                : messages;

            // Create embed with the action
            const embed = new EmbedBuilder()
                .setColor('#FFB300')
                .setDescription(
                    message
                        .replace('{user}', `**${interaction.user.username}**`)
                        .replace('{target}', `**${targetUser.username}**`)
                )
                .setImage(gifUrl)
                .setFooter({
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Error in cuddle command:', error);

            const errorMessage = t(Locale.EnglishUS, 'commands.fun.error');

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage, embeds: [] });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

export default command;
