/**
 * Fun Expression Commands
 * Self-expression commands (no target user needed)
 * Uses Nekobest API for anime GIFs
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../types';
import { getNekobest, NekobestExpression } from '../../utils/nekobest';
import { getGuildLocale, t } from '../../utils/i18n';
import logger from '../../utils/logger';

// Define all expression commands
const expressions: Array<{
    name: NekobestExpression;
    nameKey: string;
    descriptionKey: string;
}> = [
    { name: NekobestExpression.Lurk, nameKey: 'commands.fun.lurk.name', descriptionKey: 'commands.fun.lurk.description' },
    { name: NekobestExpression.Shoot, nameKey: 'commands.fun.shoot.name', descriptionKey: 'commands.fun.shoot.description' },
    { name: NekobestExpression.Sleep, nameKey: 'commands.fun.sleep.name', descriptionKey: 'commands.fun.sleep.description' },
    { name: NekobestExpression.Shrug, nameKey: 'commands.fun.shrug.name', descriptionKey: 'commands.fun.shrug.description' },
    { name: NekobestExpression.Stare, nameKey: 'commands.fun.stare.name', descriptionKey: 'commands.fun.stare.description' },
    { name: NekobestExpression.Wave, nameKey: 'commands.fun.wave.name', descriptionKey: 'commands.fun.wave.description' },
    { name: NekobestExpression.Smile, nameKey: 'commands.fun.smile.name', descriptionKey: 'commands.fun.smile.description' },
    { name: NekobestExpression.Wink, nameKey: 'commands.fun.wink.name', descriptionKey: 'commands.fun.wink.description' },
    { name: NekobestExpression.Blush, nameKey: 'commands.fun.blush.name', descriptionKey: 'commands.fun.blush.description' },
    { name: NekobestExpression.Smug, nameKey: 'commands.fun.smug.name', descriptionKey: 'commands.fun.smug.description' },
    { name: NekobestExpression.Think, nameKey: 'commands.fun.think.name', descriptionKey: 'commands.fun.think.description' },
    { name: NekobestExpression.Bored, nameKey: 'commands.fun.bored.name', descriptionKey: 'commands.fun.bored.description' },
    { name: NekobestExpression.Nom, nameKey: 'commands.fun.nom.name', descriptionKey: 'commands.fun.nom.description' },
    { name: NekobestExpression.Yawn, nameKey: 'commands.fun.yawn.name', descriptionKey: 'commands.fun.yawn.description' },
    { name: NekobestExpression.Facepalm, nameKey: 'commands.fun.facepalm.name', descriptionKey: 'commands.fun.facepalm.description' },
    { name: NekobestExpression.Happy, nameKey: 'commands.fun.happy.name', descriptionKey: 'commands.fun.happy.description' },
    { name: NekobestExpression.Baka, nameKey: 'commands.fun.baka.name', descriptionKey: 'commands.fun.baka.description' },
    { name: NekobestExpression.Angry, nameKey: 'commands.fun.angry.name', descriptionKey: 'commands.fun.angry.description' },
    { name: NekobestExpression.Run, nameKey: 'commands.fun.run.name', descriptionKey: 'commands.fun.run.description' },
    { name: NekobestExpression.Nod, nameKey: 'commands.fun.nod.name', descriptionKey: 'commands.fun.nod.description' },
    { name: NekobestExpression.Nope, nameKey: 'commands.fun.nope.name', descriptionKey: 'commands.fun.nope.description' },
    { name: NekobestExpression.Dance, nameKey: 'commands.fun.dance.name', descriptionKey: 'commands.fun.dance.description' },
    { name: NekobestExpression.Cry, nameKey: 'commands.fun.cry.name', descriptionKey: 'commands.fun.cry.description' },
    { name: NekobestExpression.Pout, nameKey: 'commands.fun.pout.name', descriptionKey: 'commands.fun.pout.description' },
    { name: NekobestExpression.Thumbsup, nameKey: 'commands.fun.thumbsup.name', descriptionKey: 'commands.fun.thumbsup.description' },
    { name: NekobestExpression.Laugh, nameKey: 'commands.fun.laugh.name', descriptionKey: 'commands.fun.laugh.description' },
];

/**
 * Factory function to create expression commands
 */
function createExpressionCommand(expression: typeof expressions[0]): Command {
    return {
        data: new SlashCommandBuilder()
            .setName(expression.name)
            .setDescription(t('en', expression.descriptionKey))
            .setDescriptionLocalizations({
                vi: t('vi', expression.descriptionKey),
            }) as SlashCommandBuilder,

        category: CommandCategory.Fun,
        cooldown: 3,

        async execute(interaction: ChatInputCommandInteraction) {
            try {
                const guildId = interaction.guildId;

                // Get guild locale for translations
                const locale = guildId ? await getGuildLocale(guildId) : 'en';

                // Defer reply as API call might take a moment
                await interaction.deferReply();

                // Fetch GIF from Nekobest API
                const gifUrl = await getNekobest(expression.name);

                // Create embed with the expression
                const embed = new EmbedBuilder()
                    .setColor('#FFB300')
                    .setDescription(
                        t(locale, `commands.fun.${expression.name}.success`, {
                            user: `**${interaction.user.username}**`
                        })
                    )
                    .setImage(gifUrl)
                    .setFooter({
                        text: `Requested by ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                logger.error(`Error in ${expression.name} command:`, error);

                const errorMessage = interaction.deferred
                    ? { content: t('en', 'common.error'), embeds: [] }
                    : { content: t('en', 'common.error'), ephemeral: true };

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    };
}

// Export all expression commands
export const expressionCommands: Command[] = expressions.map(expression => createExpressionCommand(expression));
