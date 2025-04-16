import { useCallback } from 'react'
import { useWizardStore } from '../stores'
import { WizardService } from '../services/wizardService'
import { type Transaction, type Category } from '../lib/types'

/**
 * Hook for wizard actions related to AI suggestions and category selection
 */
export function useWizardActions() {
  const store = useWizardStore()

  /**
   * Initialize the wizard
   */
  const initializeWizard = useCallback(async () => {
    await WizardService.initialize()
  }, [])

  /**
   * Request an AI suggestion for a transaction
   */
  const requestSuggestion = useCallback(async (transaction: Transaction) => {
    await WizardService.requestAISuggestion(transaction)
  }, [])

  /**
   * Select a category for the current transaction
   */
  const selectCategory = useCallback((category: Category | null, createRule = false) => {
    const currentTransaction = store.getCurrentTransaction()
    if (currentTransaction) {
      store.setSelectedCategory(currentTransaction.id, category?.id || null, createRule)
    }
  }, [store])

  /**
   * Set the create rule flag for the current transaction
   */
  const setCreateRule = useCallback((createRule: boolean) => {
    const currentTransaction = store.getCurrentTransaction()
    if (currentTransaction) {
      store.setCreateRule(currentTransaction.id, createRule)
    }
  }, [store])

  /**
   * Get the create rule flag for a transaction
   */
  const shouldCreateRule = useCallback((transactionId: string) => {
    return store.shouldCreateRule(transactionId)
  }, [store])

  /**
   * Get the create rule flag for the current transaction
   */
  const getCurrentCreateRule = useCallback(() => {
    const currentTransaction = store.getCurrentTransaction()
    return currentTransaction ? store.shouldCreateRule(currentTransaction.id) : false
  }, [store])

  /**
   * Navigate to the next transaction
   */
  const nextTransaction = useCallback(async () => {
    await WizardService.nextTransaction()
  }, [])

  /**
   * Navigate to the previous transaction
   */
  const previousTransaction = useCallback(async () => {
    await WizardService.previousTransaction()
  }, [])

  /**
   * Save all categorized transactions
   */
  const saveCategories = useCallback(async () => {
    await WizardService.saveCategories()
  }, [])

  /**
   * Get the AI suggestion for a transaction
   */
  const getSuggestion = useCallback((transactionId: string) => {
    return store.aiSuggestions.get(transactionId)
  }, [store.aiSuggestions])

  /**
   * Get the selected category for a transaction
   */
  const getSelectedCategory = useCallback((transactionId: string) => {
    return store.selectedCategories.get(transactionId)
  }, [store.selectedCategories])

  /**
   * Get the current progress
   */
  const getProgress = useCallback(() => {
    return store.getProgress()
  }, [store])

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    return store.selectedCategories.size > 0
  }, [store.selectedCategories])

  return {
    // State
    currentTransaction: store.getCurrentTransaction(),
    transactions: store.transactions,
    isLoading: store.isLoading,
    error: store.error,
    canGoNext: store.canGoNext(),
    canGoPrevious: store.canGoPrevious(),

    // Actions
    initializeWizard,
    requestSuggestion,
    selectCategory,
    setCreateRule,
    shouldCreateRule,
    getCurrentCreateRule,
    nextTransaction,
    previousTransaction,
    saveCategories,
    getSuggestion,
    getSelectedCategory,
    getProgress,
    hasUnsavedChanges
  }
} 