import { GoogleGenerativeAI, type HarmCategory, type HarmBlockThreshold } from '@google/generative-ai';
import { KeytarService, ApiKeyType } from './keytar-service';
import { GeminiResponse, GeminiCategorySuggestion, GeminiError, ERROR_CODES } from './types';

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
   * @returns Promise resolving to initialization result
   */
  static async initialize(): Promise<GeminiResponse<boolean>> {
    try {
      const apiKey = await KeytarService.getApiKey(ApiKeyType.GOOGLE_GEMINI);
      
      if (!apiKey) {
        console.warn('No Gemini API key found. Gemini service will not be available.');
        this.initialized = false;
        return {
          success: false,
          data: false,
          error: {
            message: 'No Gemini API key found',
            details: 'Please add your Google Gemini API key in the settings'
          }
        };
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.initialized = true;
      console.log('Gemini API client initialized successfully');
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.error('Error initializing Gemini API client:', error);
      this.initialized = false;
      return {
        success: false,
        data: false,
        error: {
          message: 'Failed to initialize Gemini API client',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
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
   * @param modelName The name of the model to use (defaults to gemini-2.0-flash)
   * @returns The model instance or null if not initialized
   */
  private static getModel(modelName = 'gemini-2.0-flash') {
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
   * Suggests a category for a transaction based on its description and amount
   */
  static async suggestCategory(
    description: string,
    amount: number,
    details?: string,
    existingCategories?: string[]
  ): Promise<GeminiResponse<GeminiCategorySuggestion[]>> {
    console.log('[Gemini] suggestCategory called with:', {
      description,
      amount,
      details: details || 'N/A',
      categories: existingCategories || 'N/A'
    })

    try {
      if (!this.isInitialized()) {
        console.log('[Gemini] Not initialized, attempting to initialize...')
        const initResult = await this.initialize()
        if (!initResult.success) {
          console.error('[Gemini] Initialization failed:', initResult.error)
          return {
            success: false,
            data: null,
            error: {
              message: 'Gemini API not initialized',
              details: initResult.error?.details || 'Failed to initialize the Gemini client'
            }
          }
        }
        console.log('[Gemini] Initialization successful')
      }

      const model = this.getModel()
      if (!model) {
        console.error('[Gemini] Failed to get model')
        return {
          success: false,
          data: null,
          error: {
            message: 'Failed to get Gemini model',
            details: 'Model initialization failed'
          }
        }
      }
      
      console.log('[Gemini] Using model:', (model as any).model)

      // Format the available categories
      const categoriesText = existingCategories && existingCategories.length > 0
        ? `\nAvailable Categories: ${existingCategories.join(', ')}`
        : '\nSuggest appropriate categories as there are none defined yet.'

      // Build the prompt
      const prompt = `
      I need you to categorize a financial transaction based on these details:
      
      Description: ${description}
      Amount: ${amount}
      ${details ? `Additional Details: ${details}` : ''}
      ${categoriesText}
      
      Please provide your top 3 category suggestions in this exact JSON format:
      [
        {
          "category": "Category Name",
          "confidence": 0.9,
          "reasoning": "Brief explanation for why this category fits"
        }
      ]
      
      Rules:
      1. If an exact category match exists in the available categories, use it.
      2. Otherwise, suggest the most appropriate category from the available list.
      3. If no categories are provided, suggest logical financial categories.
      4. Confidence should be between 0 and 1.
      5. Your response must be valid JSON that can be parsed.
      6. ONLY return the JSON array, nothing else.
      `

      console.log('[Gemini] Sending prompt to model:', prompt)

      // Get the response
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()
      
      console.log('[Gemini] Raw response from model:', text)

      // Extract and parse the JSON
      try {
        // Extract JSON if it's wrapped in backticks or other formatting
        const jsonMatch = text.match(/(\[[\s\S]*\])/m)
        const jsonText = jsonMatch ? jsonMatch[0] : text
        
        console.log('[Gemini] Extracted JSON:', jsonText)
        
        // Parse the JSON
        const suggestions = JSON.parse(jsonText) as GeminiCategorySuggestion[]
        
        console.log('[Gemini] Parsed suggestions:', suggestions)
        
        return {
          success: true,
          data: suggestions
        }
      } catch (parseError) {
        console.error('[Gemini] Error parsing response as JSON:', parseError)
        return {
          success: false,
          data: null,
          error: {
            message: 'Failed to parse AI response',
            details: `Response was not valid JSON: ${text.substring(0, 100)}...`
          }
        }
      }
    } catch (error) {
      console.error('[Gemini] Error in suggestCategory:', error)
      return {
        success: false,
        data: null,
        error: {
          message: 'Gemini API error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      }
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

  static async batchProcessTransactions(
    transactions: Array<{ id: string; description: string; amount: number; details?: string }>,
    existingCategories: string[] = []
  ): Promise<GeminiResponse<Array<{ transactionId: string; suggestedCategories: Array<{ category: string; confidence: number; reasoning: string }> | null }>>> {
    try {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return {
          success: false,
          data: null,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Transactions must be a non-empty array'
          }
        };
      }

      if (!this.isInitialized()) {
        await this.initialize();
        
        if (!this.isInitialized()) {
          return {
            success: false,
            data: null,
            error: {
              code: ERROR_CODES.NOT_INITIALIZED,
              message: 'Failed to initialize Gemini API client'
            }
          };
        }
      }

      const results: Array<{ transactionId: string; suggestedCategories: Array<{ category: string; confidence: number; reasoning: string }> | null }> = [];
      const batchSize = 10;
      const errors: Array<{ transactionId: string; error: GeminiError }> = [];

      // Process transactions in batches
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        // Process each transaction in the batch concurrently
        const batchPromises = batch.map(async transaction => {
          try {
            const result = await this.suggestCategory(
              transaction.description,
              transaction.amount,
              transaction.details,
              existingCategories
            );
            
            return {
              transactionId: transaction.id,
              suggestedCategories: result.success ? result.data : null
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
              transactionId: transaction.id,
              error: {
                code: ERROR_CODES.API_ERROR,
                message: 'Error processing transaction',
                details: errorMessage
              }
            });
            return {
              transactionId: transaction.id,
              suggestedCategories: null
            };
          }
        });

        // Wait for all transactions in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add a small delay between batches to respect rate limits
        if (i + batchSize < transactions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Handle the error details as string
      const errorDetails = errors.length > 0 
        ? `${errors.length} transactions failed to process: ${errors.map(e => e.transactionId).join(', ')}`
        : undefined;

      return {
        success: true,
        data: results,
        error: errors.length > 0 ? {
          code: ERROR_CODES.BATCH_PROCESSING,
          message: 'Some transactions failed to process',
          details: errorDetails
        } : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in batch processing transactions:', error);
      return {
        success: false,
        data: null,
        error: {
          code: ERROR_CODES.BATCH_PROCESSING,
          message: 'Error processing transactions batch',
          details: errorMessage
        }
      };
    }
  }
} 