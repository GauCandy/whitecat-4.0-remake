/**
 * Guild Create Event
 * Fired when the bot joins a new server
 * - Adds guild to database
 * - Detects and sets guild locale from Discord
 * - Logs who invited the bot
 */

import {
    Guild,
    AuditLogEvent,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { Event } from '../types';
import { pool } from '../database/config';
import { mapDiscordLocale, t } from '../utils/i18n';
import logger from '../utils/logger';

/**
 * Find the best channel to send welcome message
 * Priority: system channel > rules channel > first text channel with send permission
 */
async function findWelcomeChannel(guild: Guild): Promise<TextChannel | null> {
    // Try system channel first (where @everyone messages go)
    if (guild.systemChannel?.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)) {
        return guild.systemChannel;
    }

    // Try rules channel
    if (guild.rulesChannel?.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)) {
        return guild.rulesChannel as TextChannel;
    }

    // Find first text channel where bot can send messages
    const channels = guild.channels.cache.filter(
        (channel): channel is TextChannel =>
            channel.isTextBased() &&
            !channel.isThread() &&
            !channel.isVoiceBased() &&
            channel.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages) === true
    );

    return channels.first() || null;
}

/**
 * Build welcome embed with language selection (Step 1)
 */
function buildWelcomeMessage(locale: string, inviterMention?: string) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord Blurple
        .setTitle(t(locale, 'events.guildCreate.step1_title'))
        .setDescription(t(locale, 'events.guildCreate.welcome_description'))
        .setTimestamp();

    // Language select menu
    const languageSelect = new StringSelectMenuBuilder()
        .setCustomId('setup_language')
        .setPlaceholder(t(locale, 'events.guildCreate.language_select_placeholder'))
        .addOptions([
            {
                label: t(locale, 'events.guildCreate.language_option_en_us'),
                value: 'en-US',
                emoji: '🇺🇸',
            },
            {
                label: t(locale, 'events.guildCreate.language_option_vi'),
                value: 'vi',
                emoji: '🇻🇳',
            },
        ]);

    // Default language button
    const defaultLanguageButton = new ButtonBuilder()
        .setCustomId('setup_default_language')
        .setLabel(t(locale, 'events.guildCreate.button_default_language'))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌐');

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(languageSelect);
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(defaultLanguageButton);

    // Setup prompt with inviter mention
    const setupPrompt = inviterMention
        ? t(locale, 'events.guildCreate.setup_prompt').replace('{inviter}', inviterMention)
        : '';

    return { content: setupPrompt, embeds: [embed], components: [row1, row2] };
}

/**
 * Build prefix setup message (Step 2)
 */
export function buildPrefixSetupMessage(locale: string) {
    // Get locale display name
    const localeDisplayName = locale === 'vi' ? 'Tiếng Việt' : 'English (US)';

    const description = t(locale, 'events.guildCreate.step2_description')
        .replace('{locale}', localeDisplayName)
        .replace('{prefix}', '!');

    const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord Blurple
        .setTitle(t(locale, 'events.guildCreate.step2_title'))
        .setDescription(description)
        .setTimestamp();

    const customPrefixButton = new ButtonBuilder()
        .setCustomId('setup_custom_prefix')
        .setLabel(t(locale, 'events.guildCreate.button_custom_prefix'))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚙️');

    const defaultPrefixButton = new ButtonBuilder()
        .setCustomId('setup_default_prefix')
        .setLabel(t(locale, 'events.guildCreate.button_default_prefix'))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❗');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(customPrefixButton, defaultPrefixButton);

    return { embeds: [embed], components: [row] };
}

const event: Event<'guildCreate'> = {
    name: 'guildCreate',
    once: false,
    async execute(guild: Guild) {
        try {
            logger.info(`Bot joined new guild: ${guild.name} (${guild.id})`);

            // Detect guild's preferred locale from Discord
            const discordLocale = guild.preferredLocale; // Discord API returns locale like "vi", "en-US"
            const mappedLocale = mapDiscordLocale(discordLocale);

            logger.info(`Guild ${guild.name} locale detected: ${discordLocale} -> ${mappedLocale}`);

            // Try to get who invited the bot (requires ViewAuditLog permission)
            let invitedBy: string | null = null;
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    limit: 10,
                    type: AuditLogEvent.BotAdd,
                });

                const botAddLog = auditLogs.entries.find(
                    entry => entry.target?.id === guild.client.user.id
                );

                if (botAddLog) {
                    invitedBy = botAddLog.executor?.id || null;
                    logger.info(`Bot was invited by: ${botAddLog.executor?.tag} (${invitedBy})`);
                }
            } catch (error) {
                logger.warn(`Could not fetch audit logs for ${guild.name} - missing permissions?`);
            }

            // Check if guild already exists in database
            const existingGuild = await pool.query(
                'SELECT guild_id FROM guilds WHERE guild_id = $1',
                [guild.id]
            );

            if (existingGuild.rows.length > 0) {
                logger.warn(`Guild ${guild.name} already exists in database. Updating...`);

                // Update existing guild - reset left_at and update locale
                await pool.query(
                    `UPDATE guilds
                     SET locale = $1,
                         left_at = NULL
                     WHERE guild_id = $2`,
                    [mappedLocale, guild.id]
                );

                logger.info(`Guild ${guild.name} updated in database`);
            } else {
                // Insert new guild into database
                await pool.query(
                    `INSERT INTO guilds (guild_id, locale, prefix)
                     VALUES ($1, $2, $3)`,
                    [guild.id, mappedLocale, '!']
                );

                logger.info(`Guild ${guild.name} added to database with locale: ${mappedLocale}`);
            }

            // Find appropriate channel to send welcome message
            const welcomeChannel = await findWelcomeChannel(guild);

            if (welcomeChannel) {
                try {
                    // Build and send welcome message with language selection
                    const inviterMention = invitedBy ? `<@${invitedBy}>` : undefined;
                    const welcomeMessage = buildWelcomeMessage(mappedLocale, inviterMention);

                    await welcomeChannel.send({
                        ...welcomeMessage,
                        allowedMentions: { users: invitedBy ? [invitedBy] : [] }
                    });
                    logger.info(`Sent welcome message to ${guild.name} in channel: ${welcomeChannel.name}`);
                } catch (error) {
                    logger.error(`Failed to send welcome message to ${guild.name}:`, error);
                }
            } else {
                logger.warn(`Could not find suitable channel to send welcome message in ${guild.name}`);
            }

        } catch (error) {
            logger.error('Error in guildCreate event:', error);
        }
    }
};

export default event;
