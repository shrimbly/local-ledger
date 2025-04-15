import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { 
  CategorizationRule, 
  CategorizationRuleCreateInput, 
  CategorizationRuleUpdateInput,
  Transaction
} from '../lib/types'
import { 
  getAllCategorizationRules, 
  getCategorizationRuleById, 
  getCategorizationRulesByCategory,
  createCategorizationRule, 
  updateCategorizationRule, 
  deleteCategorizationRule,
  applyCategoryRules,
  createRuleSuggestionFromTransaction
} from '../services/categorizationRuleService'

interface RuleState {
  rules: CategorizationRule[]
  isLoading: boolean
  error: string | null
  suggestedRule: CategorizationRuleCreateInput | null
  
  // Actions
  fetchRules: () => Promise<void>
  fetchRulesByCategory: (categoryId: string) => Promise<void>
  addRule: (rule: CategorizationRuleCreateInput) => Promise<void>
  updateRule: (id: string, data: CategorizationRuleUpdateInput) => Promise<void>
  removeRule: (id: string) => Promise<void>
  applyRulesToTransaction: (transaction: Transaction) => Promise<string | null>
  setSuggestedRule: (rule: CategorizationRuleCreateInput | null) => void
  createSuggestionFromTransaction: (transaction: Transaction, categoryId: string) => void
  clearSuggestion: () => void
  
  // Selectors
  getRulesByCategory: (categoryId: string) => CategorizationRule[]
  getRuleById: (id: string) => CategorizationRule | undefined
}

export const useRuleStore = create<RuleState>()(
  persist(
    devtools(
      (set, get) => ({
        rules: [],
        isLoading: false,
        error: null,
        suggestedRule: null,
        
        // Fetch all rules
        fetchRules: async () => {
          set({ isLoading: true, error: null })
          try {
            const data = await getAllCategorizationRules()
            set({ rules: data, isLoading: false })
          } catch (err) {
            console.error('Error fetching rules:', err)
            set({
              error: 'Failed to fetch categorization rules',
              isLoading: false
            })
          }
        },
        
        // Fetch rules for a specific category
        fetchRulesByCategory: async (categoryId) => {
          set({ isLoading: true, error: null })
          try {
            const data = await getCategorizationRulesByCategory(categoryId)
            set({ rules: data, isLoading: false })
          } catch (err) {
            console.error(`Error fetching rules for category ${categoryId}:`, err)
            set({
              error: `Failed to fetch rules for category`,
              isLoading: false
            })
          }
        },
        
        // Add a new rule
        addRule: async (rule) => {
          set({ isLoading: true, error: null })
          try {
            await createCategorizationRule(rule)
            // Refresh rules after adding
            await get().fetchRules()
          } catch (err) {
            console.error('Error adding rule:', err)
            set({
              error: 'Failed to add categorization rule',
              isLoading: false
            })
          }
        },
        
        // Update an existing rule
        updateRule: async (id, data) => {
          set({ isLoading: true, error: null })
          try {
            await updateCategorizationRule(id, data)
            await get().fetchRules()
          } catch (err) {
            console.error(`Error updating rule ${id}:`, err)
            set({
              error: 'Failed to update rule',
              isLoading: false
            })
          }
        },
        
        // Delete a rule
        removeRule: async (id) => {
          set({ isLoading: true, error: null })
          try {
            await deleteCategorizationRule(id)
            await get().fetchRules()
          } catch (err) {
            console.error(`Error deleting rule ${id}:`, err)
            set({
              error: 'Failed to delete rule',
              isLoading: false
            })
          }
        },
        
        // Apply rules to transaction
        applyRulesToTransaction: async (transaction) => {
          try {
            return await applyCategoryRules(transaction)
          } catch (err) {
            console.error('Error applying rules to transaction:', err)
            return null
          }
        },
        
        // Set suggested rule
        setSuggestedRule: (rule) => {
          set({ suggestedRule: rule })
        },
        
        // Create rule suggestion from transaction
        createSuggestionFromTransaction: (transaction, categoryId) => {
          const suggestion = createRuleSuggestionFromTransaction(transaction, categoryId)
          set({ suggestedRule: suggestion })
        },
        
        // Clear suggested rule
        clearSuggestion: () => {
          set({ suggestedRule: null })
        },
        
        // Get rules for a specific category
        getRulesByCategory: (categoryId) => {
          return get().rules.filter(rule => rule.categoryId === categoryId)
        },
        
        // Find a rule by ID
        getRuleById: (id) => {
          return get().rules.find(rule => rule.id === id)
        }
      }),
      { name: 'RuleStore' }
    ),
    {
      name: 'rule-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist rules data
        rules: state.rules
      }),
      version: 1,
    }
  )
)

// Create optimized selector hooks for better performance
export const useRuleSelectors = () => {
  // Using useShallow to optimize re-renders
  const isLoading = useRuleStore(state => state.isLoading)
  const error = useRuleStore(state => state.error)
  const suggestedRule = useRuleStore(state => state.suggestedRule)
  
  // Use a selector function for derived data
  const ruleCount = useRuleStore(useShallow(state => state.rules.length))
  
  return {
    isLoading,
    error,
    suggestedRule,
    ruleCount
  }
} 