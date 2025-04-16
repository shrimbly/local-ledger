import { useEffect, useCallback, useState } from 'react'
import { Dialog, DialogContent, DialogPortal } from '../ui/dialog'
import { useWizardActions } from '../../hooks/useWizardActions'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'
import { TransactionDetails } from './TransactionDetails'
import { CategorySuggestions } from './CategorySuggestions'
import { type CategorySuggestion } from '../../lib/types'
import { useCategoryStore } from '../../stores/categoryStore'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay
} from "../ui/alert-dialog"
import { toast } from 'sonner'

interface CategoryWizardProps {
  isOpen: boolean
  onClose: () => void
}

export function CategoryWizard({ isOpen, onClose }: CategoryWizardProps) {
  const {
    initializeWizard,
    currentTransaction,
    transactions,
    isLoading,
    error,
    canGoNext,
    canGoPrevious,
    nextTransaction,
    previousTransaction,
    saveCategories,
    getProgress,
    getSuggestion,
    selectCategory,
    requestSuggestion,
    hasUnsavedChanges,
    setCreateRule,
    shouldCreateRule,
    getCurrentCreateRule
  } = useWizardActions()

  // Get categories from the store
  const categories = useCategoryStore(state => state.categories)
  // Map categories to string array for TransactionDetails
  const categoryNames = categories.map(category => category.name)

  // State for confirmation dialog
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  // Get create rule state from the store
  const createRule = getCurrentCreateRule()

  // Initialize keyboard navigation
  useKeyboardNavigation()

  // Initialize wizard when opened
  useEffect(() => {
    if (isOpen) {
      initializeWizard()
    }
  }, [isOpen, initializeWizard])

  // Handle save and exit
  const handleSave = useCallback(async () => {
    try {
      await saveCategories()
      toast.success('Changes saved successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to save changes. Please try again.')
      console.error('Save error:', error)
    }
  }, [saveCategories, onClose])

  // Handle exit attempt
  const handleExitAttempt = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowExitConfirmation(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Escape to attempt exit
      if (e.key === 'Escape') {
        e.preventDefault()
        handleExitAttempt()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleExitAttempt])

  // Get current progress
  const progress = getProgress()
  const progressPercentage = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0

  function handleSuggestionSelect(categoryName: string) {
    const category = categories.find(c => c.name === categoryName) || null;
    // Pass the current createRule flag when selecting a category
    selectCategory(category, createRule);
    
    // Auto-navigate to next transaction if possible
    if (canGoNext) {
      setTimeout(() => nextTransaction(), 300); // Small delay for better UX
    }
  }

  function handleCategorySelect(categoryName: string) {
    const category = categories.find(c => c.name === categoryName) || null;
    // Pass the current createRule flag when selecting a category
    selectCategory(category, createRule);
    
    // Auto-navigate to next transaction if possible
    if (canGoNext) {
      setTimeout(() => nextTransaction(), 300); // Small delay for better UX
    }
  }

  // Handle checkbox state changes
  function handleCreateRuleChange(checked: boolean) {
    setCreateRule(checked);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleExitAttempt()}>
        <DialogContent 
          className="min-w-[900px] w-[90vw] max-w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          style={{ 
            "--open-select-position": "fixed",
            "--open-select-fallback-placement-side": "bottom",
            "--open-select-fallback-placement-align": "start",
            "--open-select-fallback-placement-offset": "0",
          } as React.CSSProperties}
        >
          {/* Header with improved styling */}
          <div className="flex items-center justify-between p-6 border-b bg-muted/20">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Categorize Transactions</h2>
              <KeyboardShortcutsHelp />
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium flex items-center gap-2">
                <Progress value={progressPercentage} className="w-40 h-2 progress-animate-value" />
                <span>{Math.round(progressPercentage)}%</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.completed} of {progress.total} transactions
              </span>
            </div>
          </div>

          {/* Main content with two-column layout and improved spacing */}
          <div className="flex-1 flex min-h-0">
            {/* Transaction details pane */}
            <div className="w-1/2 border-r p-6 overflow-y-auto bg-background/50">
              {isLoading.transactions ? (
                <TransactionDetailsSkeleton />
              ) : error.transactions ? (
                <div className="text-destructive p-4 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="font-medium">Error loading transactions</p>
                  <p className="text-sm">{error.transactions}</p>
                </div>
              ) : !currentTransaction ? (
                <div className="text-muted-foreground p-4 text-center border rounded-md">
                  No transactions to categorize
                </div>
              ) : (
                <TransactionDetails 
                  transaction={currentTransaction}
                  categories={categoryNames}
                  onCategorySelect={handleCategorySelect}
                  createRule={createRule}
                  onCreateRuleChange={handleCreateRuleChange}
                />
              )}
            </div>

            {/* Category selection pane with visual emphasis */}
            <div className="w-1/2 p-6 overflow-y-auto bg-background">
              {isLoading.transactions ? (
                <CategorySuggestionsSkeleton />
              ) : error.suggestions ? (
                <div className="text-destructive p-4 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="font-medium">Error getting suggestions</p>
                  <p className="text-sm">{error.suggestions}</p>
                </div>
              ) : !currentTransaction ? (
                <div className="text-muted-foreground p-4 text-center border rounded-md">
                  Select a transaction to see suggestions
                </div>
              ) : (
                <CategorySuggestions
                  transaction={currentTransaction}
                  isLoading={isLoading.suggestions}
                  suggestions={getSuggestion(currentTransaction.id) || []}
                  onSelectCategory={handleSuggestionSelect}
                  onRequestSuggestions={() => requestSuggestion(currentTransaction)}
                />
              )}
            </div>
          </div>

          {/* Footer with enhanced navigation controls */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => previousTransaction()}
                disabled={!canGoPrevious || isLoading.transactions}
                className="flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => nextTransaction()}
                disabled={!canGoNext || isLoading.transactions}
                className="flex items-center gap-1"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExitAttempt}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={progress.completed === 0 || isLoading.save}
                className={progress.completed > 0 ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isLoading.save ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogOverlay className="fixed inset-0 bg-black/50" style={{ zIndex: 9998 }} />
        <AlertDialogContent className="bg-background border border-gray-300 shadow-xl rounded-xl" style={{ backgroundColor: "white", zIndex: 9999 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              You have unsaved changes. Are you sure you want to exit? All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">Continue Editing</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={onClose}>Exit Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function TransactionDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-3/4" />
    </div>
  )
}

function CategorySuggestionsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}