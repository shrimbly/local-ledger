/**
 * API Key type constants
 */
export enum ApiKeyType {
  GOOGLE_GEMINI = 'google-gemini',
}

/**
 * Service for managing API keys securely
 */
export const apiKeyService = {
  /**
   * Store an API key securely
   * @param type API key type
   * @param key API key to store
   * @returns Promise resolving to true if successful
   */
  async storeApiKey(type: ApiKeyType, key: string): Promise<boolean> {
    try {
      // Validate API key format
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error('Invalid API key format');
      }
      
      return await window.database.apiKeys.store(type, key);
    } catch (error) {
      console.error(`Error storing ${type} API key:`, error);
      throw error;
    }
  },

  /**
   * Retrieve an API key
   * @param type API key type
   * @returns Promise resolving to the API key or null if not found
   */
  async getApiKey(type: ApiKeyType): Promise<string | null> {
    try {
      return await window.database.apiKeys.get(type);
    } catch (error) {
      console.error(`Error retrieving ${type} API key:`, error);
      throw error;
    }
  },

  /**
   * Delete an API key
   * @param type API key type
   * @returns Promise resolving to true if deleted successfully
   */
  async deleteApiKey(type: ApiKeyType): Promise<boolean> {
    try {
      return await window.database.apiKeys.delete(type);
    } catch (error) {
      console.error(`Error deleting ${type} API key:`, error);
      throw error;
    }
  },

  /**
   * Check if an API key exists
   * @param type API key type
   * @returns Promise resolving to true if the key exists, false otherwise
   */
  async hasApiKey(type: ApiKeyType): Promise<boolean> {
    try {
      return await window.database.apiKeys.exists(type);
    } catch (error) {
      console.error(`Error checking ${type} API key:`, error);
      return false;
    }
  },
}; 