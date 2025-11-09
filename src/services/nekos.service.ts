import axios from 'axios';

export type NekosCategory =
  // Action categories (2 người)
  | 'hug' | 'kiss' | 'pat' | 'cuddle' | 'poke' | 'slap' | 'punch' | 'kick'
  | 'tickle' | 'bite' | 'feed' | 'handhold' | 'highfive' | 'handshake' | 'yeet'
  // Emote categories (1 người)
  | 'baka' | 'blush' | 'bored' | 'cry' | 'dance' | 'facepalm' | 'happy'
  | 'laugh' | 'nod' | 'nom' | 'nope' | 'pat' | 'peck' | 'poke' | 'pout'
  | 'shrug' | 'slap' | 'smile' | 'smug' | 'stare' | 'think' | 'wave' | 'wink' | 'yawn';

interface NekosApiResponse {
  results: Array<{
    artist_href: string;
    artist_name: string;
    source_url: string;
    url: string;
  }>;
}

class NekosService {
  private readonly baseUrl = 'https://nekos.best/api/v2';
  private cache: Map<NekosCategory, { url: string; timestamp: number }> = new Map();
  private readonly cacheDuration = 300000; // 5 phút

  /**
   * Lấy GIF ngẫu nhiên từ Nekos.best API
   * @param category Loại action/emote
   * @returns URL của GIF
   */
  async getRandomGif(category: NekosCategory): Promise<string> {
    // Check cache
    const cached = this.cache.get(category);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheDuration) {
      return cached.url;
    }

    try {
      const response = await axios.get<NekosApiResponse>(
        `${this.baseUrl}/${category}`,
        {
          params: { amount: 1 },
          timeout: 5000,
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const gifUrl = response.data.results[0].url;

        // Cache result
        this.cache.set(category, { url: gifUrl, timestamp: now });

        return gifUrl;
      }

      throw new Error('No results from Nekos.best API');
    } catch (error) {
      console.error(`Error fetching ${category} GIF from Nekos.best:`, error);

      // Fallback: trả về URL placeholder nếu API fail
      return 'https://http.cat/404';
    }
  }

  /**
   * Clear cache (dùng khi cần refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache cho category cụ thể
   */
  clearCategoryCache(category: NekosCategory): void {
    this.cache.delete(category);
  }
}

export const nekosService = new NekosService();
