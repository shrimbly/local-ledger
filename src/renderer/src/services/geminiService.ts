/**
 * Service for interacting with Google Gemini API
 */
export const geminiService = {
  /**
   * Initialize the Gemini API client
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(): Promise<boolean> {
    try {
      return await window.database.gemini.initialize();
    } catch (error) {
      console.error('Error initializing Gemini API client:', error);
      return false;
    }
  },

  /**
   * Check if the Gemini API client is initialized
   * @returns Promise resolving to true if initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      return await window.database.gemini.isInitialized();
    } catch (error) {
      console.error('Error checking if Gemini API client is initialized:', error);
      return false;
    }
  },

  /**
   * Suggest a category for a transaction
   * @param description Transaction description
   * @param amount Transaction amount
   * @param details Optional additional transaction details
   * @param existingCategories Optional array of existing category names
   * @returns Promise resolving to the suggested category name
   */
  async suggestCategory(
    description: string,
    amount: number,
    details?: string,
    existingCategories?: string[]
  ): Promise<string | null> {
    try {
      // First check if the client is initialized, if not initialize it
      const isInitialized = await this.isInitialized();
      if (!isInitialized) {
        const success = await this.initialize();
        if (!success) {
          console.error('Failed to initialize Gemini API client');
          return null;
        }
      }

      return await window.database.gemini.suggestCategory(
        description,
        amount,
        details,
        existingCategories
      );
    } catch (error) {
      console.error('Error suggesting category:', error);
      return null;
    }
  },

  /**
   * Analyze a set of transactions for patterns and insights
   * @param transactions Array of transactions to analyze
   * @returns Promise resolving to analysis insights
   */
  async analyzeTransactions(transactions: any[]): Promise<string | null> {
    try {
      // First check if the client is initialized, if not initialize it
      const isInitialized = await this.isInitialized();
      if (!isInitialized) {
        const success = await this.initialize();
        if (!success) {
          console.error('Failed to initialize Gemini API client');
          return null;
        }
      }

      return await window.database.gemini.analyzeTransactions(transactions);
    } catch (error) {
      console.error('Error analyzing transactions:', error);
      return null;
    }
  }
}; 