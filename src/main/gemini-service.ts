import { GoogleGenerativeAI, type HarmCategory, type HarmBlockThreshold } from '@google/generative-ai';
import { KeytarService, ApiKeyType } from './keytar-service';
import { GeminiResponse, GeminiCategorySuggestion, GeminiError, ERROR_CODES, Transaction, Category } from './types';

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

// Add the AI Analysis Summary interface (or import if moved to types.ts)
interface AiAnalysisDataSummary {
  timePeriod: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  expenseBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
    spendingType?: string;
    description?: string;
  }>;
  spendingTypeBreakdown: {
    essential: { amount: number, percentage: number },
    discretionary: { amount: number, percentage: number },
    mixed: { amount: number, percentage: number },
    unclassified: { amount: number, percentage: number }
  };
  uncategorizedExpenses: {
    amount: number;
    count: number;
  };
  largestExpense?: {
    description: string;
    amount: number;
    category?: string;
    spendingType?: string;
    categoryDescription?: string;
  };
}

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
   * Analyze aggregated financial data for patterns and insights
   * @param summaryData The aggregated AiAnalysisDataSummary object
   * @returns Promise resolving to analysis insights string
   */
  static async analyzeTransactions(summaryData: AiAnalysisDataSummary & { 
    userQuery?: string; 
    conversationHistory?: Array<{ role: string; content: string }>; 
  }): Promise<string | null> {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
        if (!this.isInitialized()) {
          console.error('Failed to initialize Gemini API client');
          return 'Error: Gemini API not initialized. Please check your API key in Settings.';
        }
      }

      // Use the specified model name
      const modelName = "gemini-2.5-pro-exp-03-25";
      const model = this.genAI?.getGenerativeModel({ model: modelName });

      if (!model) {
        console.error('Could not get Gemini model instance.');
        return 'Error: Could not access Gemini model.';
      }

      // --- Construct the new prompt --- 
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency', 
          currency: 'USD'
        }).format(amount)
      }

      // Check if this is a follow-up question or initial analysis
      const isFollowUp = !!summaryData.userQuery && summaryData.conversationHistory && summaryData.conversationHistory.length > 0;

      let prompt = '';
      
      if (isFollowUp) {
        // This is a follow-up question, create a chat-style prompt
        prompt = `You are a helpful financial analyst assistant. Your goal is to provide clear, actionable insights based on the user's spending data.

Here is the financial summary for the period: ${summaryData.timePeriod}

FINANCIAL DATA CONTEXT:
- Total Income: ${formatCurrency(summaryData.totalIncome)}
- Total Expenses: ${formatCurrency(summaryData.totalExpenses)}
- Net Income/Savings: ${formatCurrency(summaryData.netAmount)}
- Essential Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.essential.amount)} (${summaryData.spendingTypeBreakdown.essential.percentage.toFixed(1)}%)
- Discretionary Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.discretionary.amount)} (${summaryData.spendingTypeBreakdown.discretionary.percentage.toFixed(1)}%)
- Mixed Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.mixed.amount)} (${summaryData.spendingTypeBreakdown.mixed.percentage.toFixed(1)}%)
- Top Expense Categories: ${summaryData.expenseBreakdown.slice(0, 5).map(cat => 
          `${cat.name} (${formatCurrency(cat.amount)}, ${cat.percentage.toFixed(1)}%)`).join(', ')}

PREVIOUS CONVERSATION:
${summaryData.conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}

USER'S NEW QUESTION: ${summaryData.userQuery}

Please provide a helpful, concise answer to the user's question. You can reference any of the financial data above and previous conversation. Format your response using Markdown for readability. Be specific and base your answer on the actual financial data provided.`;
      } else {
        // This is the initial analysis request
        prompt = `You are a helpful financial analyst assistant. Your goal is to provide clear, actionable insights based on the user's spending data.

Here is the financial summary for the period: ${summaryData.timePeriod}

Overall:
* Total Income: ${formatCurrency(summaryData.totalIncome)}
* Total Expenses: ${formatCurrency(summaryData.totalExpenses)}
* Net Income/Savings: ${formatCurrency(summaryData.netAmount)}

Spending Breakdown by Category (Sorted by amount):
`;

        if (summaryData.expenseBreakdown.length > 0) {
          summaryData.expenseBreakdown.forEach(cat => {
            const spendingTypeLabel = cat.spendingType ? ` [${cat.spendingType}]` : '';
            const descriptionText = cat.description ? ` - ${cat.description}` : ''; 
            prompt += `* ${cat.name}${spendingTypeLabel}: ${formatCurrency(cat.amount)} (${cat.percentage.toFixed(1)}%)${descriptionText}\n`;
          });
        } else {
          prompt += `* No categorized expenses found for this period.\n`;
        }

        // Add spending type breakdown
        prompt += `\nSpending by Type:
* Essential Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.essential.amount)} (${summaryData.spendingTypeBreakdown.essential.percentage.toFixed(1)}%)
* Discretionary Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.discretionary.amount)} (${summaryData.spendingTypeBreakdown.discretionary.percentage.toFixed(1)}%)
* Mixed Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.mixed.amount)} (${summaryData.spendingTypeBreakdown.mixed.percentage.toFixed(1)}%)
* Unclassified Expenses: ${formatCurrency(summaryData.spendingTypeBreakdown.unclassified.amount)} (${summaryData.spendingTypeBreakdown.unclassified.percentage.toFixed(1)}%)\n`;

        if (summaryData.uncategorizedExpenses.count > 0) {
          prompt += `\nUncategorized Expenses:
* Amount: ${formatCurrency(summaryData.uncategorizedExpenses.amount)}
* Number of Transactions: ${summaryData.uncategorizedExpenses.count}\n`;
        }

        if (summaryData.largestExpense) {
          const spendingTypeLabel = summaryData.largestExpense.spendingType 
            ? `\n* Spending Type: ${summaryData.largestExpense.spendingType}` 
            : '';
          
          const categoryDescriptionText = summaryData.largestExpense.categoryDescription
            ? `\n* Category Description: ${summaryData.largestExpense.categoryDescription}`
            : '';
          
          prompt += `\nLargest Single Expense:
* Description: ${summaryData.largestExpense.description}
* Amount: ${formatCurrency(summaryData.largestExpense.amount)}
* Category: ${summaryData.largestExpense.category || 'N/A'}${spendingTypeLabel}${categoryDescriptionText}\n`;
        }

        // Append the instructions part
        prompt += `\nPlease analyze this summary and provide:
1. Key observations about spending patterns based on both the category breakdown and spending types (essential vs. discretionary).
2. Identification of the top 3-5 spending categories and their significance.
3. Analysis of the balance between essential and discretionary spending.
4. Potential areas where the user might be overspending or could save money, based on the category data and spending types.
5. A concise summary of the user's spending habits for this period.

Format your response using Markdown. Be clear, concise, and actionable. Avoid generic advice not directly supported by the data.`;
      }
      // --- End of prompt construction ---

      console.log(`[Gemini Service] Sending prompt to model: ${modelName}\n---\n${isFollowUp ? 'FOLLOW-UP QUERY' : 'INITIAL ANALYSIS'}\n---`);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log('[Gemini Service] Received response text length:', text?.length);
      return text;
      
    } catch (error) {
      console.error('Error analyzing transactions:', error);
      // Provide a more informative error message to the user
      let errorMessage = 'Error analyzing transactions.';
      if (error instanceof Error) {
        // Check for common API errors if possible (e.g., authentication, quota)
        if (error.message.includes('API key not valid')) {
          errorMessage = 'Error: Invalid Gemini API key. Please check your API key in Settings.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Error: Gemini API quota exceeded. Please try again later.';
        }
      }
      return errorMessage; 
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