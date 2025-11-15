/**
 * Fun Action Commands
 * Interactive commands that require a target user
 * Uses Nekobest API for anime GIFs
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../types';
import { getNekobest, NekobestAction } from '../../utils/nekobest';
import { getGuildLocale, t, Locale } from '../../utils/i18n';
import logger from '../../utils/logger';

// Define all action commands
const actions: Array<{
    name: NekobestAction;
    nameKey: string;
    descriptionKey: string;
}> = [
    { name: NekobestAction.Poke, nameKey: 'commands.fun.poke.name', descriptionKey: 'commands.fun.poke.description' },
    { name: NekobestAction.Peck, nameKey: 'commands.fun.peck.name', descriptionKey: 'commands.fun.peck.description' },
    { name: NekobestAction.Tickle, nameKey: 'commands.fun.tickle.name', descriptionKey: 'commands.fun.tickle.description' },
    { name: NekobestAction.Highfive, nameKey: 'commands.fun.highfive.name', descriptionKey: 'commands.fun.highfive.description' },
    { name: NekobestAction.Feed, nameKey: 'commands.fun.feed.name', descriptionKey: 'commands.fun.feed.description' },
    { name: NekobestAction.Bite, nameKey: 'commands.fun.bite.name', descriptionKey: 'commands.fun.bite.description' },
    { name: NekobestAction.Cuddle, nameKey: 'commands.fun.cuddle.name', descriptionKey: 'commands.fun.cuddle.description' },
    { name: NekobestAction.Kick, nameKey: 'commands.fun.kick.name', descriptionKey: 'commands.fun.kick.description' },
    { name: NekobestAction.Hug, nameKey: 'commands.fun.hug.name', descriptionKey: 'commands.fun.hug.description' },
    { name: NekobestAction.Pat, nameKey: 'commands.fun.pat.name', descriptionKey: 'commands.fun.pat.description' },
    { name: NekobestAction.Kiss, nameKey: 'commands.fun.kiss.name', descriptionKey: 'commands.fun.kiss.description' },
    { name: NekobestAction.Punch, nameKey: 'commands.fun.punch.name', descriptionKey: 'commands.fun.punch.description' },
    { name: NekobestAction.Handshake, nameKey: 'commands.fun.handshake.name', descriptionKey: 'commands.fun.handshake.description' },
    { name: NekobestAction.Slap, nameKey: 'commands.fun.slap.name', descriptionKey: 'commands.fun.slap.description' },
    { name: NekobestAction.Handhold, nameKey: 'commands.fun.handhold.name', descriptionKey: 'commands.fun.handhold.description' },
    { name: NekobestAction.Yeet, nameKey: 'commands.fun.yeet.name', descriptionKey: 'commands.fun.yeet.description' },
];

/**
 * Factory function to create action commands
 */
function createActionCommand(action: typeof actions[0]): Command {
    return {
        data: new SlashCommandBuilder()
            .setName(action.name)
            .setDescription(t(Locale.English, action.descriptionKey))
            .setDescriptionLocalizations({
                vi: t(Locale.Vietnamese, action.descriptionKey),
            })
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
                const locale = guildId ? await getGuildLocale(guildId) : Locale.English;

                // Check if targeting bot
                const isBot = targetUser.id === interaction.client.user.id;

                // Prevent self-targeting
                if (targetUser.id === interaction.user.id) {
                    const selfMessages = t(locale, `commands.fun.${action.name}.self`);
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
                const gifUrl = await getNekobest(action.name);

                // Get message (handle bot case or normal)
                const messageKey = isBot ? `commands.fun.${action.name}.bot` : `commands.fun.${action.name}.message`;
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
                logger.error(`Error in ${action.name} command:`, error);

                const errorMessage = t(Locale.English, 'commands.fun.error');

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: errorMessage, embeds: [] });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }
    };
}

// Export all action commands
export const actionCommands: Command[] = actions.map(action => createActionCommand(action));
