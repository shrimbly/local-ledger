import { useWizardStore } from '../stores'
import { 
  type Transaction, 
  type CategorySuggestion, 
  type GeminiResponse, 
  type GeminiCategorySuggestion 
} from '../lib/types'

/**
 * Service for managing wizard state and IPC communication
 */
export class WizardService {
  /**
   * Load uncategorized transactions into the wizard store
   */
  static async loadUncategorizedTransactions(): Promise<void> {
    const store = useWizardStore.getState()
    store.setLoading('transactions', true)
    store.setError('transactions', undefined)

    try {
      const transactions = await window.database.transactions.getAll() as Transaction[]
      // Filter uncategorized transactions (in case the IPC isn't working)
      const uncategorizedTransactions = transactions.filter(t => !t.categoryId)
      store.setTransactions(uncategorizedTransactions)
    } catch (error) {
      console.error('Error loading uncategorized transactions:', error)
      store.setError('transactions', 'Failed to load uncategorized transactions')
    } finally {
      store.setLoading('transactions', false)
    }
  }

  /**
   * Request an AI suggestion for a transaction
   */
  static async requestAISuggestion(transaction: Transaction): Promise<void> {
    const store = useWizardStore.getState()
    const transactionId = transaction.id

    console.log(`[Wizard] Requesting AI suggestion for transaction ${transactionId}`, transaction)

    // Skip if already processed
    if (store.aiSuggestions.has(transactionId)) {
      console.log(`[Wizard] Skipping suggestion request - already processed for ${transactionId}`)
      return
    }

    store.setLoading('suggestions', true)
    store.setError('suggestions', undefined)

    try {
      // Check if Gemini API is initialized
      console.log(`[Wizard] Checking if Gemini API is initialized`)
      const isInitialized = await window.database.gemini.isInitialized()
      console.log(`[Wizard] Gemini API initialized: ${isInitialized}`)
      
      if (!isInitialized) {
        console.log(`[Wizard] Gemini API not initialized, attempting to initialize...`)
        const initResult = await window.database.gemini.initialize()
        console.log(`[Wizard] Gemini API initialization result:`, initResult)
        
        if (!initResult) {
          console.error(`[Wizard] Failed to initialize Gemini API: unknown error`)
          store.setError('suggestions', 'Failed to initialize AI: unknown error')
          store.setLoading('suggestions', false)
          return
        }
      }

      // Get all categories to pass to the AI
      const categories = await window.database.categories.getAll()
      const categoryNames = categories.map(cat => cat.name)
      console.log(`[Wizard] Got ${categories.length} categories for AI suggestion`, categoryNames)

      console.log(`[Wizard] Calling Gemini API with:`, {
        description: transaction.description,
        amount: transaction.amount,
        details: transaction.details || undefined,
        categories: categoryNames
      })

      // Request suggestion from Gemini API
      const response = await window.database.gemini.suggestCategory(
        transaction.description,
        transaction.amount,
        transaction.details || undefined,
        categoryNames
      )

      console.log(`[Wizard] Received Gemini API response:`, response)

      // Check if response was successful and has data
      if (response && response.success && response.data && Array.isArray(response.data)) {
        // Convert to CategorySuggestion[]
        const suggestions: CategorySuggestion[] = response.data.map(suggestion => ({
          category: suggestion.category,
          confidence: suggestion.confidence || 0,
          explanation: suggestion.reasoning || ''
        }))

        console.log(`[Wizard] Processed ${suggestions.length} suggestions:`, suggestions)

        // Store suggestions
        if (suggestions && suggestions.length > 0) {
          store.setAISuggestion(transactionId, suggestions)
          console.log(`[Wizard] Stored suggestions for ${transactionId}`)
        } else {
          console.warn('[Wizard] No suggestions in response from AI:', response)
          store.setError('suggestions', 'No suggestions received from AI')
        }
      } else {
        // Handle error response
        console.error('[Wizard] Invalid response from AI:', response ? response.error || 'Unknown error' : 'No response')
        store.setError('suggestions', 
          response && response.error ? response.error.message : 'Failed to get AI suggestions')
      }
    } catch (error) {
      console.error(`[Wizard] Error getting AI suggestions for transaction ${transactionId}:`, error)
      store.setError('suggestions', 'Failed to get AI suggestions')
    } finally {
      store.setLoading('suggestions', false)
    }
  }

  /**
   * Save categorized transactions
   */
  static async saveCategories(): Promise<void> {
    const store = useWizardStore.getState()
    store.setLoading('save', true)
    store.setError('save', undefined)

    try {
      const updates = Array.from(store.selectedCategories.entries())
      
      // No updates to make
      if (updates.length === 0) {
        return
      }

      // Get categories for rule creation
      const categories = await window.database.categories.getAll()
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Process each transaction
      for (const [transactionId, categoryId] of updates) {
        try {
          // First update the transaction's category
          await window.database.transactions.update(transactionId, { categoryId });
          
          // Check if we should create a rule for this transaction
          const shouldCreateRule = store.shouldCreateRule(transactionId);
          
          if (shouldCreateRule && categoryId) {
            // Get transaction details to create a pattern
            const transaction = store.transactions.find(t => t.id === transactionId);
            if (transaction && transaction.description) {
              // Create a rule based on the transaction description
              // We create a simple rule using the first few words of the description
              // A more sophisticated approach would use NLP or pattern detection
              const words = transaction.description.split(/\s+/);
              const patternWords = words.slice(0, Math.min(3, words.length)); // Use first 3 words max
              const pattern = patternWords.join('\\s+'); // Regex pattern with word boundaries
              
              const category = categoryMap.get(categoryId);
              
              // Create the rule
              await window.database.categorizationRules.create({
                pattern: pattern,
                isRegex: true,
                description: `Auto-created from transaction: ${transaction.description}`,
                priority: 10, // Medium priority
                isEnabled: true,
                categoryId: categoryId
              });
              
              console.log(`[Wizard] Created rule for pattern "${pattern}" with category "${category?.name || categoryId}"`);
            }
          }
        } catch (error) {
          console.error(`[Wizard] Error processing transaction ${transactionId}:`, error);
          // Continue with other transactions even if one fails
        }
      }
      
      // Reset store state
      store.reset();
    } catch (error) {
      console.error('Error saving categorized transactions:', error);
      store.setError('save', 'Failed to save categorized transactions');
    } finally {
      store.setLoading('save', false);
    }
  }

  /**
   * Navigate to a specific transaction and ensure it has an AI suggestion
   */
  static async navigateToTransaction(index: number): Promise<void> {
    const store = useWizardStore.getState()
    const transaction = store.transactions[index]

    if (!transaction) {
      return
    }

    store.setCurrentIndex(index)

    // Request AI suggestion if we don't have one
    if (!store.aiSuggestions.has(transaction.id)) {
      await this.requestAISuggestion(transaction)
    }
  }

  /**
   * Navigate to the next transaction
   */
  static async nextTransaction(): Promise<void> {
    const store = useWizardStore.getState()
    if (store.canGoNext()) {
      await this.navigateToTransaction(store.currentIndex + 1)
    }
  }

  /**
   * Navigate to the previous transaction
   */
  static async previousTransaction(): Promise<void> {
    const store = useWizardStore.getState()
    if (store.canGoPrevious()) {
      await this.navigateToTransaction(store.currentIndex - 1)
    }
  }

  /**
   * Initialize the wizard
   */
  static async initialize(): Promise<void> {
    await this.loadUncategorizedTransactions()
    const store = useWizardStore.getState()
    
    if (store.transactions.length > 0) {
      await this.navigateToTransaction(0)
    }
  }
}