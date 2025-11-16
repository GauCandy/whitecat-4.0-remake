/**
 * Giveaway Manager
 * Handles automatic giveaway ending and winner selection
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { pool } from '../database/config';
import { botLogger } from '../utils/logger';
import type { Giveaway, GiveawayWinner } from '../types/giveaway';

export class GiveawayManager {
  private client: Client;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Start monitoring giveaways
   */
  start(): void {
    botLogger.info('🎁 Starting giveaway manager...');

    // Check immediately on start
    this.checkExpiredGiveaways();

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkExpiredGiveaways();
    }, this.CHECK_INTERVAL_MS);

    botLogger.info('✅ Giveaway manager started');
  }

  /**
   * Stop monitoring giveaways
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      botLogger.info('🛑 Giveaway manager stopped');
    }
  }

  /**
   * Check for expired giveaways and end them
   */
  private async checkExpiredGiveaways(): Promise<void> {
    try {
      const result = await pool.query<Giveaway>(
        `SELECT g.*, gu.guild_id as guild_discord_id
         FROM giveaways g
         JOIN guilds gu ON g.guild_id = gu.id
         WHERE g.ended = false AND g.ends_at <= NOW()`
      );

      if (result.rows.length > 0) {
        botLogger.info(`🎁 Found ${result.rows.length} expired giveaway(s), ending...`);

        for (const giveaway of result.rows) {
          await this.endGiveaway(giveaway);
        }
      }
    } catch (error) {
      botLogger.error('❌ Error checking expired giveaways:', error);
    }
  }

  /**
   * End a giveaway and select winners
   */
  async endGiveaway(giveaway: Giveaway & { guild_discord_id?: string }): Promise<GiveawayWinner[]> {
    try {
      // Get all entries for this giveaway
      const entriesResult = await pool.query(
        `SELECT ge.user_id, u.discord_id, u.username
         FROM giveaway_entries ge
         JOIN users u ON ge.user_id = u.id
         WHERE ge.giveaway_id = $1`,
        [giveaway.id]
      );

      const entries = entriesResult.rows;

      if (entries.length === 0) {
        await this.announceNoWinners(giveaway);
        await this.markAsEnded(giveaway.id);
        return [];
      }

      // Select random winners
      const winners = this.selectRandomWinners(entries, giveaway.winner_count);

      // Announce winners
      await this.announceWinners(giveaway, winners);

      // Mark as ended
      await this.markAsEnded(giveaway.id);

      botLogger.info(`🎁 Ended giveaway ${giveaway.id} with ${winners.length} winner(s)`);

      return winners;
    } catch (error) {
      botLogger.error(`❌ Error ending giveaway ${giveaway.id}:`, error);
      return [];
    }
  }

  /**
   * Select random winners from entries
   */
  private selectRandomWinners(entries: any[], count: number): GiveawayWinner[] {
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, entries.length));
  }

  /**
   * Announce winners in the channel
   */
  private async announceWinners(giveaway: Giveaway & { guild_discord_id?: string }, winners: GiveawayWinner[]): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.message_id);
      if (!message) return;

      const winnerMentions = winners.map(w => `<@${w.discord_id}>`).join(', ');

      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway Ended!')
        .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):** ${winnerMentions}`)
        .setColor(0x00ff00)
        .setTimestamp();

      await message.edit({ embeds: [embed] });

      await channel.send({
        content: `Congratulations ${winnerMentions}! You won **${giveaway.prize}**! 🎉`,
      });
    } catch (error) {
      botLogger.error('❌ Error announcing winners:', error);
    }
  }

  /**
   * Announce that there are no winners
   */
  private async announceNoWinners(giveaway: Giveaway): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.message_id);
      if (!message) return;

      const embed = new EmbedBuilder()
        .setTitle('🎁 Giveaway Ended')
        .setDescription(`**Prize:** ${giveaway.prize}\n\nNo valid entries. No winners selected.`)
        .setColor(0xff0000)
        .setTimestamp();

      await message.edit({ embeds: [embed] });
    } catch (error) {
      botLogger.error('❌ Error announcing no winners:', error);
    }
  }

  /**
   * Mark giveaway as ended in database
   */
  private async markAsEnded(giveawayId: number): Promise<void> {
    await pool.query(
      'UPDATE giveaways SET ended = true WHERE id = $1',
      [giveawayId]
    );
  }

  /**
   * Reroll winners for a giveaway
   */
  async rerollWinners(giveawayId: number): Promise<GiveawayWinner[]> {
    try {
      const giveawayResult = await pool.query<Giveaway>(
        'SELECT * FROM giveaways WHERE id = $1',
        [giveawayId]
      );

      if (giveawayResult.rows.length === 0) {
        throw new Error('Giveaway not found');
      }

      const giveaway = giveawayResult.rows[0];

      if (!giveaway.ended) {
        throw new Error('Giveaway has not ended yet');
      }

      // Get all entries
      const entriesResult = await pool.query(
        `SELECT ge.user_id, u.discord_id, u.username
         FROM giveaway_entries ge
         JOIN users u ON ge.user_id = u.id
         WHERE ge.giveaway_id = $1`,
        [giveawayId]
      );

      if (entriesResult.rows.length === 0) {
        throw new Error('No entries for this giveaway');
      }

      // Select new winners
      const winners = this.selectRandomWinners(entriesResult.rows, giveaway.winner_count);

      // Announce new winners
      await this.announceWinners(giveaway, winners);

      return winners;
    } catch (error) {
      botLogger.error(`❌ Error rerolling giveaway ${giveawayId}:`, error);
      throw error;
    }
  }
}
