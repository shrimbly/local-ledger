import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Transaction } from '../lib/types'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

interface DialogState {
  isOpen: boolean
  type: 'add' | 'edit' | 'delete' | 'category' | 'batch-category' | null
  data?: any
}

interface UiState {
  // Dialog state
  dialog: DialogState
  
  // Transaction being edited
  editingTransaction: Transaction | null
  
  // Batch operations
  isBatchAssigning: boolean
  
  // Theme
  isDarkMode: boolean
  
  // View settings
  compactView: boolean
  
  // Actions
  openDialog: (type: DialogState['type'], data?: any) => void
  closeDialog: () => void
  setEditingTransaction: (transaction: Transaction | null) => void
  setBatchAssigning: (value: boolean) => void
  toggleDarkMode: () => void
  setCompactView: (value: boolean) => void
}

const initialDialogState: DialogState = {
  isOpen: false,
  type: null,
  data: undefined
}

export const useUiStore = create<UiState>()(
  persist(
    devtools(
      (set) => ({
        dialog: initialDialogState,
        editingTransaction: null,
        isBatchAssigning: false,
        isDarkMode: false,
        compactView: false,
        
        // Open a dialog
        openDialog: (type, data) => {
          set({
            dialog: {
              isOpen: true,
              type,
              data
            }
          })
        },
        
        // Close the current dialog
        closeDialog: () => {
          set({
            dialog: initialDialogState
          })
        },
        
        // Set transaction being edited
        setEditingTransaction: (transaction) => {
          set({
            editingTransaction: transaction
          })
        },
        
        // Set batch assigning state
        setBatchAssigning: (value) => {
          set({
            isBatchAssigning: value
          })
        },
        
        // Toggle dark mode
        toggleDarkMode: () => {
          set(state => ({
            isDarkMode: !state.isDarkMode
          }))
        },
        
        // Set compact view
        setCompactView: (value) => {
          set({
            compactView: value
          })
        }
      }),
      { name: 'UiStore' }
    ),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist UI preferences, not transient dialog states
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        compactView: state.compactView
      }),
      version: 1
    }
  )
)

// Create optimized selector hooks for better performance
export const useUiSelectors = () => {
  const dialog = useUiStore(state => state.dialog)
  const editingTransaction = useUiStore(state => state.editingTransaction)
  const isBatchAssigning = useUiStore(state => state.isBatchAssigning)
  
  // For UI preferences, use shallow equality check to avoid unnecessary rerenders
  const uiPreferences = useUiStore(useShallow(state => ({
    isDarkMode: state.isDarkMode,
    compactView: state.compactView
  })))
  
  return {
    dialog,
    editingTransaction,
    isBatchAssigning,
    isDarkMode: uiPreferences.isDarkMode,
    compactView: uiPreferences.compactView
  }
} 