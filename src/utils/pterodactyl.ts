import axios, { AxiosInstance } from 'axios';

export interface PterodactylUser {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
  root_admin: boolean;
  '2fa': boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserParams {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password?: string;
  external_id?: string;
  root_admin?: boolean;
  language?: string;
}

export class PterodactylAPI {
  private client: AxiosInstance | null = null;
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.PTERODACTYL_URL || '';
    this.apiKey = process.env.PTERODACTYL_API_KEY || '';
  }

  /**
   * Initialize the Axios client (lazy initialization)
   */
  private getClient(): AxiosInstance {
    if (!this.baseURL || !this.apiKey) {
      throw new Error('PTERODACTYL_URL and PTERODACTYL_API_KEY must be set in .env');
    }

    if (!this.client) {
      this.client = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    }

    return this.client;
  }

  /**
   * Get user by external ID (Discord ID)
   */
  async getUserByExternalId(externalId: string): Promise<PterodactylUser | null> {
    try {
      const response = await this.getClient().get(`/api/application/users?filter[external_id]=${externalId}`);

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].attributes;
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<PterodactylUser | null> {
    try {
      const response = await this.getClient().get(`/api/application/users?filter[email]=${email}`);

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].attributes;
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<PterodactylUser | null> {
    try {
      const response = await this.getClient().get(`/api/application/users?filter[username]=${username}`);

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].attributes;
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new Pterodactyl user
   */
  async createUser(params: CreateUserParams): Promise<PterodactylUser> {
    try {
      const payload: any = {
        email: params.email,
        username: params.username,
        first_name: params.first_name,
        last_name: params.last_name,
        external_id: params.external_id || null,
        root_admin: params.root_admin || false,
        language: params.language || 'en',
      };

      // Add password if provided
      if (params.password) {
        payload.password = params.password;
      }

      const response = await this.getClient().post('/api/application/users', payload);
      return response.data.attributes;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create Pterodactyl user: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<PterodactylUser | null> {
    try {
      const response = await this.getClient().get(`/api/application/users/${userId}`);
      return response.data.attributes;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getClient().get('/api/application/users?per_page=1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const pterodactyl = new PterodactylAPI();
