/**
 * Nekobest API Utility
 * https://nekos.best/
 * API for anime reaction GIFs
 */

import axios from 'axios';
import logger from './logger';

const NEKOBEST_API_BASE = 'https://nekos.best/api/v2';

export interface NekobestResponse {
    results: Array<{
        url: string;
        anime_name: string;
    }>;
}

export enum NekobestAction {
    // Actions (require target user)
    Poke = 'poke',
    Peck = 'peck',
    Tickle = 'tickle',
    Highfive = 'highfive',
    Feed = 'feed',
    Bite = 'bite',
    Cuddle = 'cuddle',
    Kick = 'kick',
    Hug = 'hug',
    Pat = 'pat',
    Kiss = 'kiss',
    Punch = 'punch',
    Handshake = 'handshake',
    Slap = 'slap',
    Handhold = 'handhold',
    Yeet = 'yeet',
    Baka = 'baka',
}

export enum NekobestExpression {
    // Expressions (self only)
    Lurk = 'lurk',
    Shoot = 'shoot',
    Sleep = 'sleep',
    Shrug = 'shrug',
    Stare = 'stare',
    Wave = 'wave',
    Smile = 'smile',
    Wink = 'wink',
    Blush = 'blush',
    Smug = 'smug',
    Think = 'think',
    Bored = 'bored',
    Nom = 'nom',
    Yawn = 'yawn',
    Facepalm = 'facepalm',
    Happy = 'happy',
    Angry = 'angry',
    Run = 'run',
    Nod = 'nod',
    Nope = 'nope',
    Dance = 'dance',
    Cry = 'cry',
    Pout = 'pout',
    Thumbsup = 'thumbsup',
    Laugh = 'laugh',
}

/**
 * Get a random GIF from nekobest API
 * @param endpoint - The endpoint to fetch from (e.g., 'poke', 'hug', 'smile')
 * @returns GIF URL
 */
export async function getNekobest(endpoint: NekobestAction | NekobestExpression): Promise<string> {
    try {
        const response = await axios.get<NekobestResponse>(
            `${NEKOBEST_API_BASE}/${endpoint}`,
            {
                timeout: 5000,
                headers: {
                    'User-Agent': 'WhiteCat-Discord-Bot/4.0'
                }
            }
        );

        if (response.data && response.data.results && response.data.results.length > 0) {
            return response.data.results[0].url;
        } else {
            logger.warn(`Nekobest API returned invalid response for ${endpoint}`);
            throw new Error('Invalid response from Nekobest API');
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.error(`Nekobest API error for ${endpoint}:`, error.message);
        } else {
            logger.error(`Unknown error fetching nekobest ${endpoint}:`, error);
        }
        throw error;
    }
}

/**
 * Check if an endpoint is an action (requires target)
 */
export function isAction(endpoint: string): boolean {
    return Object.values(NekobestAction).includes(endpoint as NekobestAction);
}

/**
 * Check if an endpoint is an expression (self only)
 */
export function isExpression(endpoint: string): boolean {
    return Object.values(NekobestExpression).includes(endpoint as NekobestExpression);
}
