import { Message } from 'discord.js';
import { pool } from '../database/config';
import { botLogger } from '../utils/logger';

interface AutoResponse {
  id: number;
  keyword: string;
  response: string;
  match_type: 'exact' | 'contains' | 'startswith' | 'endswith';
  is_case_sensitive: boolean;
}

// Cache để giảm database queries
const responseCache = new Map<string, { responses: AutoResponse[]; timestamp: number }>();
const blockedChannelsCache = new Map<string, { channels: Set<string>; timestamp: number }>();
const CACHE_TTL = 60000; // 1 phút

/**
 * Lấy danh sách auto-responses cho guild
 */
async function getAutoResponses(guildId: string): Promise<AutoResponse[]> {
  const cached = responseCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.responses;
  }

  try {
    const result = await pool.query(
      `SELECT ar.id, ar.keyword, ar.response, ar.match_type, ar.is_case_sensitive
       FROM auto_responses ar
       JOIN guilds g ON ar.guild_id = g.id
       WHERE g.guild_id = $1 AND ar.is_enabled = true`,
      [guildId]
    );

    const responses = result.rows as AutoResponse[];
    responseCache.set(guildId, { responses, timestamp: Date.now() });
    return responses;
  } catch (error) {
    botLogger.error(`Failed to get auto-responses for guild ${guildId}:`, error);
    return [];
  }
}

/**
 * Kiểm tra kênh có bị chặn không
 */
async function isChannelBlocked(guildId: string, channelId: string): Promise<boolean> {
  const cached = blockedChannelsCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.channels.has(channelId);
  }

  try {
    const result = await pool.query(
      `SELECT arbc.channel_id
       FROM auto_response_blocked_channels arbc
       JOIN guilds g ON arbc.guild_id = g.id
       WHERE g.guild_id = $1`,
      [guildId]
    );

    const channels = new Set(result.rows.map((row: { channel_id: string }) => row.channel_id));
    blockedChannelsCache.set(guildId, { channels, timestamp: Date.now() });
    return channels.has(channelId);
  } catch (error) {
    botLogger.error(`Failed to check blocked channel for guild ${guildId}:`, error);
    return false;
  }
}

/**
 * Kiểm tra keyword có khớp với nội dung không
 */
function matchesKeyword(content: string, keyword: string, matchType: string, caseSensitive: boolean): boolean {
  const compareContent = caseSensitive ? content : content.toLowerCase();
  const compareKeyword = caseSensitive ? keyword : keyword.toLowerCase();

  switch (matchType) {
    case 'exact':
      return compareContent === compareKeyword;
    case 'startswith':
      return compareContent.startsWith(compareKeyword);
    case 'endswith':
      return compareContent.endsWith(compareKeyword);
    case 'contains':
    default:
      return compareContent.includes(compareKeyword);
  }
}

/**
 * Xử lý auto-response cho message
 */
export async function handleAutoResponse(message: Message): Promise<boolean> {
  if (!message.guild) return false;

  const guildId = message.guild.id;
  const channelId = message.channel.id;

  // Kiểm tra kênh có bị chặn không
  if (await isChannelBlocked(guildId, channelId)) {
    return false;
  }

  // Lấy danh sách auto-responses
  const responses = await getAutoResponses(guildId);
  if (responses.length === 0) return false;

  // Tìm response phù hợp
  for (const autoResponse of responses) {
    if (matchesKeyword(message.content, autoResponse.keyword, autoResponse.match_type, autoResponse.is_case_sensitive)) {
      try {
        await message.reply(autoResponse.response);
        botLogger.info(`Auto-response triggered in guild ${guildId} for keyword: ${autoResponse.keyword}`);
        return true;
      } catch (error) {
        botLogger.error(`Failed to send auto-response:`, error);
        return false;
      }
    }
  }

  return false;
}

/**
 * Xóa cache cho guild
 */
export function clearAutoResponseCache(guildId: string): void {
  responseCache.delete(guildId);
  blockedChannelsCache.delete(guildId);
}

/**
 * Xóa toàn bộ cache
 */
export function clearAllAutoResponseCache(): void {
  responseCache.clear();
  blockedChannelsCache.clear();
}
