import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { type Transaction, type CategorySuggestion } from '../lib/types'

// Types for the wizard store
interface WizardState {
  // State
  transactions: Transaction[]
  aiSuggestions: Map<string, CategorySuggestion[]>
  selectedCategories: Map<string, string | null>
  createRules: Map<string, boolean> // Track which transactions should create rules
  currentIndex: number
  isLoading: {
    transactions: boolean
    suggestions: boolean
    save: boolean
  }
  error: {
    transactions?: string
    suggestions?: string
    save?: string
  }

  // Actions
  setTransactions: (transactions: Transaction[]) => void
  setAISuggestion: (transactionId: string, suggestions: CategorySuggestion[]) => void
  setSelectedCategory: (transactionId: string, categoryId: string | null, createRule?: boolean) => void
  setCreateRule: (transactionId: string, createRule: boolean) => void
  setCurrentIndex: (index: number) => void
  setLoading: (key: keyof WizardState['isLoading'], value: boolean) => void
  setError: (key: keyof WizardState['error'], value?: string) => void
  reset: () => void

  // Navigation
  nextTransaction: () => void
  previousTransaction: () => void
  canGoNext: () => boolean
  canGoPrevious: () => boolean
  getCurrentTransaction: () => Transaction | undefined

  // Performance optimizations
  getProgress: () => { completed: number; total: number }
  hasUnsavedChanges: () => boolean
  getTransactionStatus: (id: string) => 'pending' | 'suggested' | 'categorized'
  shouldCreateRule: (transactionId: string) => boolean
}

// Initial state
const initialState = {
  transactions: [],
  aiSuggestions: new Map<string, CategorySuggestion[]>(),
  selectedCategories: new Map<string, string | null>(),
  createRules: new Map<string, boolean>(),
  currentIndex: 0,
  isLoading: {
    transactions: false,
    suggestions: false,
    save: false
  },
  error: {}
}

// Create the store with performance optimizations
export const useWizardStore = create<WizardState>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        ...initialState,

        // State setters with optimizations
        setTransactions: (transactions) => {
          // Only update if the transactions have actually changed
          const current = get().transactions
          if (
            transactions.length !== current.length ||
            JSON.stringify(transactions) !== JSON.stringify(current)
          ) {
            set({ transactions })
          }
        },
        
        setAISuggestion: (transactionId, suggestions) =>
          set((state) => {
            // Skip update if suggestions haven't changed
            if (state.aiSuggestions.get(transactionId) === suggestions) {
              return state
            }
            return {
              aiSuggestions: new Map(state.aiSuggestions).set(transactionId, suggestions)
            }
          }),
        
        setSelectedCategory: (transactionId, categoryId, createRule = false) =>
          set((state) => {
            // Skip update if category hasn't changed
            const categoryChanged = state.selectedCategories.get(transactionId) !== categoryId;
            
            // If categoryId is null, delete the entry instead of setting it to null
            const newCategories = new Map(state.selectedCategories);
            const newCreateRules = new Map(state.createRules);
            
            if (categoryId === null) {
              newCategories.delete(transactionId);
              newCreateRules.delete(transactionId);
            } else {
              newCategories.set(transactionId, categoryId);
              newCreateRules.set(transactionId, createRule);
            }
            
            // Only update if something changed
            if (!categoryChanged && state.createRules.get(transactionId) === createRule) {
              return state;
            }
            
            return {
              selectedCategories: newCategories,
              createRules: newCreateRules
            }
          }),
        
        setCreateRule: (transactionId, createRule) =>
          set((state) => {
            // Skip update if rule creation state hasn't changed
            if (state.createRules.get(transactionId) === createRule) {
              return state;
            }
            
            const newCreateRules = new Map(state.createRules);
            newCreateRules.set(transactionId, createRule);
            
            return {
              createRules: newCreateRules
            }
          }),
        
        setCurrentIndex: (index) => {
          // Only update if the index has changed
          if (get().currentIndex !== index) {
            set({ currentIndex: index })
          }
        },
        
        setLoading: (key, value) =>
          set((state) => {
            // Skip update if loading state hasn't changed
            if (state.isLoading[key] === value) {
              return state
            }
            return {
              isLoading: { ...state.isLoading, [key]: value }
            }
          }),
        
        setError: (key, value) =>
          set((state) => {
            // Skip update if error state hasn't changed
            if (state.error[key] === value) {
              return state
            }
            return {
              error: value ? { ...state.error, [key]: value } : { ...state.error, [key]: undefined }
            }
          }),

        // Reset state
        reset: () => set(initialState),

        // Navigation methods
        nextTransaction: () =>
          set((state) => ({
            currentIndex: Math.min(state.currentIndex + 1, state.transactions.length - 1)
          })),

        previousTransaction: () =>
          set((state) => ({
            currentIndex: Math.max(state.currentIndex - 1, 0)
          })),

        canGoNext: () => {
          const state = get()
          return state.currentIndex < state.transactions.length - 1
        },

        canGoPrevious: () => {
          const state = get()
          return state.currentIndex > 0
        },

        getCurrentTransaction: () => {
          const state = get()
          return state.transactions[state.currentIndex]
        },

        // Performance optimizations
        getProgress: () => {
          const state = get()
          const total = state.transactions.length
          const completed = state.selectedCategories.size
          return { completed, total }
        },

        hasUnsavedChanges: () => {
          const state = get()
          return state.selectedCategories.size > 0
        },

        getTransactionStatus: (id: string) => {
          const state = get()
          if (state.selectedCategories.has(id)) {
            return 'categorized'
          }
          if (state.aiSuggestions.has(id)) {
            return 'suggested'
          }
          return 'pending'
        },

        shouldCreateRule: (transactionId: string) => {
          return !!get().createRules.get(transactionId);
        }
      }),
      {
        name: 'wizard-store'
      }
    )
  )
)

// Subscribe to changes for debugging
if (process.env.NODE_ENV === 'development') {
  useWizardStore.subscribe(
    (state) => state.selectedCategories,
    (selectedCategories) => {
      console.log('Selected categories updated:', selectedCategories)
    }
  )
} 