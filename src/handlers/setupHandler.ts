/**
 * Setup Interaction Handlers
 * Handles language and prefix setup interactions for new guilds
 */

import {
    StringSelectMenuInteraction,
    ButtonInteraction,
    ModalSubmitInteraction,
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    PermissionFlagsBits
} from 'discord.js';
import { pool } from '../database/config';
import { t } from '../utils/i18n';
import { buildPrefixSetupMessage } from '../events/guildCreate';
import logger from '../utils/logger';

/**
 * Get guild locale from database
 */
async function getGuildLocale(guildId: string): Promise<string> {
    try {
        const result = await pool.query(
            'SELECT locale FROM guilds WHERE guild_id = $1',
            [guildId]
        );
        return result.rows[0]?.locale || 'en-US';
    } catch (error) {
        logger.error('Error fetching guild locale:', error);
        return 'en-US';
    }
}

/**
 * Update guild locale in database
 */
async function updateGuildLocale(guildId: string, locale: string): Promise<void> {
    await pool.query(
        'UPDATE guilds SET locale = $1 WHERE guild_id = $2',
        [locale, guildId]
    );
}

/**
 * Update guild prefix in database
 */
async function updateGuildPrefix(guildId: string, prefix: string): Promise<void> {
    await pool.query(
        'UPDATE guilds SET prefix = $1 WHERE guild_id = $2',
        [prefix, guildId]
    );
}

/**
 * Handle language selection from select menu
 */
export async function handleLanguageSelect(interaction: StringSelectMenuInteraction) {
    if (!interaction.guild) return;

    // Check if user has permission to manage guild
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ You need Manage Server permission to change the language.',
            ephemeral: true
        });
        return;
    }

    try {
        const selectedLocale = interaction.values[0];

        // Update guild locale in database
        await updateGuildLocale(interaction.guildId!, selectedLocale);

        // Build prefix setup message with new language
        const prefixMessage = buildPrefixSetupMessage(selectedLocale);
        const confirmationText = t(selectedLocale, 'events.guildCreate.language_updated').replace('{locale}', selectedLocale);

        // Edit original message to show prefix setup
        await interaction.update({
            content: `✅ ${confirmationText}`,
            embeds: prefixMessage.embeds,
            components: prefixMessage.components
        });

        logger.info(`Guild ${interaction.guild.name} language updated to ${selectedLocale}`);
    } catch (error) {
        logger.error('Error handling language select:', error);
        await interaction.reply({
            content: '❌ Failed to update language. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle default language button
 */
export async function handleDefaultLanguageButton(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    // Check if user has permission to manage guild
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ You need Manage Server permission to change the language.',
            ephemeral: true
        });
        return;
    }

    try {
        // Use guild's preferred locale from Discord
        const discordLocale = interaction.guild.preferredLocale;
        const defaultLocale = discordLocale === 'vi' ? 'vi' : 'en-US';

        // Update guild locale in database
        await updateGuildLocale(interaction.guildId!, defaultLocale);

        // Build prefix setup message with new language
        const prefixMessage = buildPrefixSetupMessage(defaultLocale);
        const confirmationText = t(defaultLocale, 'events.guildCreate.language_updated').replace('{locale}', defaultLocale);

        // Edit original message to show prefix setup
        await interaction.update({
            content: `✅ ${confirmationText}`,
            embeds: prefixMessage.embeds,
            components: prefixMessage.components
        });

        logger.info(`Guild ${interaction.guild.name} language set to default: ${defaultLocale}`);
    } catch (error) {
        logger.error('Error handling default language button:', error);
        await interaction.reply({
            content: '❌ Failed to set default language. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle custom prefix button - shows modal
 */
export async function handleCustomPrefixButton(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    // Check if user has permission to manage guild
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ You need Manage Server permission to change the prefix.',
            ephemeral: true
        });
        return;
    }

    try {
        const locale = await getGuildLocale(interaction.guildId!);

        // Create modal for custom prefix input
        const modal = new ModalBuilder()
            .setCustomId(`setup_custom_prefix_modal_${interaction.guildId}`)
            .setTitle(t(locale, 'events.guildCreate.prefix_modal_title'));

        const prefixInput = new TextInputBuilder()
            .setCustomId('prefix_input')
            .setLabel(t(locale, 'events.guildCreate.prefix_modal_label'))
            .setPlaceholder(t(locale, 'events.guildCreate.prefix_modal_placeholder'))
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(prefixInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    } catch (error) {
        logger.error('Error showing custom prefix modal:', error);
        await interaction.reply({
            content: '❌ Failed to open prefix setup. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle default prefix button
 */
export async function handleDefaultPrefixButton(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    // Check if user has permission to manage guild
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ You need Manage Server permission to change the prefix.',
            ephemeral: true
        });
        return;
    }

    try {
        const locale = await getGuildLocale(interaction.guildId!);
        const defaultPrefix = '!';

        // Update guild prefix in database
        await updateGuildPrefix(interaction.guildId!, defaultPrefix);

        // Update message to remove components
        await interaction.update({
            components: []
        });

        // Send confirmation
        await interaction.followUp({
            content: t(locale, 'events.guildCreate.prefix_updated').replace('{prefix}', defaultPrefix) +
                '\n' + t(locale, 'events.guildCreate.setup_complete'),
            ephemeral: false
        });

        logger.info(`Guild ${interaction.guild.name} prefix set to default: ${defaultPrefix}`);
    } catch (error) {
        logger.error('Error handling default prefix button:', error);
        await interaction.reply({
            content: '❌ Failed to set default prefix. Please try again.',
            ephemeral: true
        });
    }
}

/**
 * Handle custom prefix modal submission
 */
export async function handleCustomPrefixModal(interaction: ModalSubmitInteraction) {
    if (!interaction.guild) return;

    try {
        const locale = await getGuildLocale(interaction.guildId!);
        const customPrefix = interaction.fields.getTextInputValue('prefix_input').trim();

        // Validate prefix (1-10 characters)
        if (customPrefix.length < 1 || customPrefix.length > 10) {
            await interaction.reply({
                content: t(locale, 'events.guildCreate.prefix_invalid'),
                ephemeral: true
            });
            return;
        }

        // Update guild prefix in database
        await updateGuildPrefix(interaction.guildId!, customPrefix);

        // Update the message that triggered the modal (remove components)
        await interaction.message?.edit({
            components: []
        });

        // Send confirmation
        await interaction.reply({
            content: t(locale, 'events.guildCreate.prefix_updated').replace('{prefix}', customPrefix) +
                '\n' + t(locale, 'events.guildCreate.setup_complete'),
            ephemeral: false
        });

        logger.info(`Guild ${interaction.guild.name} custom prefix set to: ${customPrefix}`);
    } catch (error) {
        logger.error('Error handling custom prefix modal:', error);
        await interaction.reply({
            content: '❌ Failed to set custom prefix. Please try again.',
            ephemeral: true
        });
    }
}
