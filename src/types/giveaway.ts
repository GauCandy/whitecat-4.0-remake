/**
 * Giveaway System Types
 */

export interface Giveaway {
  id: number;
  guild_id: number;
  channel_id: string;
  message_id: string;
  prize: string;
  winner_count: number;
  required_role_id?: string;
  ends_at: Date;
  ended: boolean;
  created_by: number;
  created_at: Date;
}

export interface GiveawayEntry {
  id: number;
  giveaway_id: number;
  user_id: number;
  created_at: Date;
}

export interface GiveawayWithEntries extends Giveaway {
  entry_count: number;
  entries?: GiveawayEntry[];
}

export interface GiveawayCreateOptions {
  guild_id: number;
  channel_id: string;
  message_id: string;
  prize: string;
  winner_count: number;
  duration_minutes: number;
  required_role_id?: string;
  created_by: number;
}

export interface GiveawayWinner {
  user_id: number;
  discord_id: string;
  username: string;
}
