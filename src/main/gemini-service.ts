import { GoogleGenerativeAI, type HarmCategory, type HarmBlockThreshold } from '@google/generative-ai';
import { KeytarService, ApiKeyType } from './keytar-service';

// Safety settings for the Gemini API
const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT' as HarmCategory,
    threshold: 'BLOCK_MEDIUM_AND_ABOVE' as HarmBlockThreshold
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH' as HarmCategory,
    threshold: 'BLOCK_MEDIUM_AND_ABOVE' as HarmBlockThreshold
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as HarmCategory,
    threshold: 'BLOCK_MEDIUM_AND_ABOVE' as HarmBlockThreshold
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as HarmCategory,
    threshold: 'BLOCK_MEDIUM_AND_ABOVE' as HarmBlockThreshold
  }
];

/**
 * Service for interacting with Google Gemini API
 */
export class GeminiService {
  private static genAI: GoogleGenerativeAI | null = null;
  private static initialized = false;

  /**
   * Initialize the Gemini client with the API key
   * @returns Promise resolving to true if initialization was successful
   */
  static async initialize(): Promise<boolean> {
    try {
      const apiKey = await KeytarService.getApiKey(ApiKeyType.GOOGLE_GEMINI);
      
      if (!apiKey) {
        console.warn('No Gemini API key found. Gemini service will not be available.');
        this.initialized = false;
        return false;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.initialized = true;
      console.log('Gemini API client initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Gemini API client:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if the Gemini client is initialized
   * @returns True if initialized, false otherwise
   */
  static isInitialized(): boolean {
    return this.initialized && this.genAI !== null;
  }

  /**
   * Get a Gemini model instance
   * @param modelName The name of the model to use (defaults to gemini-1.5-flash)
   * @returns The model instance or null if not initialized
   */
  private static getModel(modelName = 'gemini-1.5-flash') {
    if (!this.isInitialized() || !this.genAI) {
      console.error('Gemini API client not initialized');
      return null;
    }

    return this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings
    });
  }

  /**
   * Suggest a category for a transaction based on its description and details
   * @param description Transaction description
   * @param amount Transaction amount
   * @param details Optional additional transaction details
   * @param existingCategories Array of existing category names
   * @returns Promise resolving to the suggested category name
   */
  static async suggestCategory(
    description: string,
    amount: number,
    details?: string,
    existingCategories: string[] = []
  ): Promise<string | null> {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
        
        if (!this.isInitialized()) {
          console.error('Failed to initialize Gemini API client');
          return null;
        }
      }

      const model = this.getModel();
      if (!model) return null;

      const categoriesText = existingCategories.length > 0 
        ? `Available categories: ${existingCategories.join(', ')}`
        : 'Suggest a reasonable category name if no categories are available.';
      
      const prompt = `
        You are a financial assistant. Categorize the following transaction:
        
        Description: ${description}
        Amount: ${amount}
        ${details ? `Additional details: ${details}` : ''}
        
        ${categoriesText}
        
        Please respond with ONLY the category name. If the transaction fits into one of the existing categories, use that. Otherwise, suggest a new appropriate category based on the transaction details.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();
      
      return text;
    } catch (error) {
      console.error('Error suggesting category:', error);
      return null;
    }
  }

  /**
   * Analyze a set of transactions for patterns and insights
   * @param transactions Array of transactions to analyze
   * @returns Promise resolving to analysis insights
   */
  static async analyzeTransactions(transactions: any[]): Promise<string | null> {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
        
        if (!this.isInitialized()) {
          console.error('Failed to initialize Gemini API client');
          return null;
        }
      }

      const model = this.getModel();
      if (!model) return null;

      // Limit to 50 transactions to avoid exceeding token limits
      const limitedTransactions = transactions.slice(0, 50);
      
      const transactionsText = JSON.stringify(
        limitedTransactions.map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category?.name || 'Uncategorized'
        }))
      );

      const prompt = `
        You are a financial advisor. Analyze the following transactions and provide insights:
        
        Transactions: ${transactionsText}
        
        Please provide a brief analysis including:
        1. Spending patterns
        2. Top spending categories
        3. Unusual transactions
        4. Potential savings opportunities
        
        Limit your response to 500 words.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('Error analyzing transactions:', error);
      return null;
    }
  }
} 