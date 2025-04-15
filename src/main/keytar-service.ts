import * as keytar from 'keytar';

// Service name for keytar (used as the "account" in the OS keychain)
const SERVICE_NAME = 'local-ledger';

/**
 * API key type enum
 */
export enum ApiKeyType {
  GOOGLE_GEMINI = 'google-gemini',
}

/**
 * Service for securely storing and retrieving API keys
 */
export class KeytarService {
  /**
   * Store an API key securely
   * @param type API key type
   * @param key The API key to store
   * @returns Promise resolving to true if successful
   */
  static async storeApiKey(type: ApiKeyType, key: string): Promise<boolean> {
    try {
      await keytar.setPassword(SERVICE_NAME, type, key);
      return true;
    } catch (error) {
      console.error(`Error storing ${type} API key:`, error);
      throw error;
    }
  }

  /**
   * Retrieve an API key
   * @param type API key type
   * @returns Promise resolving to the API key or null if not found
   */
  static async getApiKey(type: ApiKeyType): Promise<string | null> {
    try {
      const apiKey = await keytar.getPassword(SERVICE_NAME, type);
      return apiKey;
    } catch (error) {
      console.error(`Error retrieving ${type} API key:`, error);
      throw error;
    }
  }

  /**
   * Delete an API key
   * @param type API key type
   * @returns Promise resolving to true if deleted successfully
   */
  static async deleteApiKey(type: ApiKeyType): Promise<boolean> {
    try {
      const result = await keytar.deletePassword(SERVICE_NAME, type);
      return result;
    } catch (error) {
      console.error(`Error deleting ${type} API key:`, error);
      throw error;
    }
  }

  /**
   * Check if an API key exists
   * @param type API key type
   * @returns Promise resolving to true if the key exists, false otherwise
   */
  static async hasApiKey(type: ApiKeyType): Promise<boolean> {
    try {
      const key = await this.getApiKey(type);
      return key !== null;
    } catch (error) {
      console.error(`Error checking ${type} API key:`, error);
      return false;
    }
  }
} 