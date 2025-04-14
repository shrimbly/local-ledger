import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { 
  Transaction, 
  TransactionCreateInput, 
  TransactionUpdateInput 
} from '../lib/types'
import { 
  getAllTransactions, 
  getTransactionById, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../services/transactionService'
import { useFilterStore } from './filterStore'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  selectedTransactions: string[]
  currentPage: number
  pageSize: number
  totalPages: number
  
  // Actions
  fetchTransactions: () => Promise<void>
  addTransaction: (transaction: TransactionCreateInput) => Promise<void>
  updateTransaction: (id: string, data: TransactionUpdateInput) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  selectTransactions: (ids: string[]) => void
  clearSelectedTransactions: () => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  
  // Selectors
  getCurrentPageTransactions: () => Transaction[]
  getFilteredTransactions: () => Transaction[]
  getFilteredPageTransactions: () => Transaction[]
  updateTotalPagesFromFiltered: () => void
  getCategoryTotals: () => { categoryId: string; categoryName: string; total: number }[]
  getMonthlyTotals: (last12Months?: boolean) => { month: string; income: number; expense: number; net: number }[]
  getTransactionById: (id: string) => Transaction | undefined
  getTransactionsByCategory: (categoryId: string) => Transaction[]
  getUnexpectedTransactions: () => Transaction[]
  getUncategorizedTransactions: () => Transaction[]
  getTotalAmount: () => number
  getFilteredTotalAmount: () => number
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    devtools(
      (set, get) => ({
        transactions: [],
        isLoading: false,
        error: null,
        selectedTransactions: [],
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        
        // Fetch all transactions
        fetchTransactions: async () => {
          set({ isLoading: true, error: null })
          try {
            const data = await getAllTransactions()
            set(state => ({
              transactions: data,
              totalPages: Math.max(1, Math.ceil(data.length / state.pageSize)),
              isLoading: false
            }))
          } catch (err) {
            console.error('Error fetching transactions:', err)
            set({
              error: 'Failed to fetch transactions',
              isLoading: false
            })
          }
        },
        
        // Add a new transaction
        addTransaction: async (transaction) => {
          set({ isLoading: true, error: null })
          try {
            await createTransaction(transaction)
            // Refresh transactions after adding
            await get().fetchTransactions()
            // Reset to first page to see the new transaction
            set({ currentPage: 1 })
          } catch (err) {
            console.error('Error adding transaction:', err)
            set({
              error: 'Failed to add transaction',
              isLoading: false
            })
          }
        },
        
        // Update an existing transaction
        updateTransaction: async (id, data) => {
          set({ isLoading: true, error: null })
          try {
            await updateTransaction(id, data)
            await get().fetchTransactions()
          } catch (err) {
            console.error('Error updating transaction:', err)
            set({
              error: 'Failed to update transaction',
              isLoading: false
            })
          }
        },
        
        // Delete a transaction
        removeTransaction: async (id) => {
          set({ isLoading: true, error: null })
          try {
            await deleteTransaction(id)
            await get().fetchTransactions()
          } catch (err) {
            console.error('Error deleting transaction:', err)
            set({
              error: 'Failed to delete transaction',
              isLoading: false
            })
          }
        },
        
        // Select transactions (for batch operations)
        selectTransactions: (ids) => {
          set({ selectedTransactions: ids })
        },
        
        // Clear selected transactions
        clearSelectedTransactions: () => {
          set({ selectedTransactions: [] })
        },
        
        // Set current page
        setCurrentPage: (page) => {
          const { totalPages } = get()
          if (page < 1 || page > totalPages) return
          set({ currentPage: page })
        },
        
        // Set page size
        setPageSize: (size) => {
          set(state => {
            const newTotalPages = Math.max(1, Math.ceil(state.transactions.length / size))
            return {
              pageSize: size,
              totalPages: newTotalPages,
              currentPage: Math.min(state.currentPage, newTotalPages)
            }
          })
        },
        
        // Get transactions for current page (without filtering)
        getCurrentPageTransactions: () => {
          const { transactions, currentPage, pageSize } = get()
          const startIndex = (currentPage - 1) * pageSize
          const endIndex = startIndex + pageSize
          return transactions.slice(startIndex, endIndex)
        },
        
        // Get filtered transactions (without pagination)
        getFilteredTransactions: () => {
          const { transactions } = get()
          return useFilterStore.getState().getFilteredAndSortedTransactions(transactions)
        },
        
        // Get filtered and paginated transactions
        getFilteredPageTransactions: () => {
          const { currentPage, pageSize } = get()
          const filteredTransactions = get().getFilteredTransactions()
          
          // Don't update state during a getter function - this causes infinite loops
          // Instead, calculate and return the data without modifying state
          const startIndex = (currentPage - 1) * pageSize
          const endIndex = startIndex + pageSize
          
          return filteredTransactions.slice(startIndex, endIndex)
        },
        
        // Separate function to update total pages based on filtered transactions
        updateTotalPagesFromFiltered: () => {
          const filteredTransactions = get().getFilteredTransactions()
          set(state => ({
            totalPages: Math.max(1, Math.ceil(filteredTransactions.length / state.pageSize))
          }))
        },
        
        // Find a transaction by ID
        getTransactionById: (id) => {
          return get().transactions.find(transaction => transaction.id === id)
        },
        
        // Get all transactions in a specific category
        getTransactionsByCategory: (categoryId) => {
          return get().transactions.filter(
            transaction => transaction.categoryId === categoryId
          )
        },
        
        // Get all transactions flagged as unexpected
        getUnexpectedTransactions: () => {
          return get().transactions.filter(
            transaction => transaction.isUnexpected
          )
        },
        
        // Get all uncategorized transactions
        getUncategorizedTransactions: () => {
          return get().transactions.filter(
            transaction => !transaction.categoryId
          )
        },
        
        // Get total amount of all transactions
        getTotalAmount: () => {
          return get().transactions.reduce(
            (total, transaction) => total + transaction.amount, 
            0
          )
        },
        
        // Get total amount of filtered transactions
        getFilteredTotalAmount: () => {
          return get().getFilteredTransactions().reduce(
            (total, transaction) => total + transaction.amount, 
            0
          )
        },
        
        // Get totals by category
        getCategoryTotals: () => {
          const { transactions } = get()
          const categoryTotals: Record<string, { 
            categoryId: string; 
            categoryName: string; 
            total: number 
          }> = {}
          
          transactions.forEach(transaction => {
            if (transaction.categoryId) {
              const categoryId = transaction.categoryId
              const categoryName = transaction.category?.name || 'Unknown'
              
              if (!categoryTotals[categoryId]) {
                categoryTotals[categoryId] = {
                  categoryId,
                  categoryName,
                  total: 0
                }
              }
              
              categoryTotals[categoryId].total += transaction.amount
            }
          })
          
          return Object.values(categoryTotals).sort((a, b) => b.total - a.total)
        },
        
        // Get monthly totals
        getMonthlyTotals: (last12Months = false) => {
          const { transactions } = get()
          const monthlyData: Record<string, { 
            month: string; 
            income: number; 
            expense: number; 
            net: number 
          }> = {}
          
          // Get all transactions sorted by date
          const sortedTransactions = [...transactions].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          
          // Determine date range
          let startDate = new Date()
          if (last12Months) {
            startDate.setMonth(startDate.getMonth() - 11)
            startDate.setDate(1) // Start of the month
          } else if (sortedTransactions.length > 0) {
            startDate = new Date(sortedTransactions[0].date)
          }
          
          // Initialize all months in the range
          const today = new Date()
          let currentDate = new Date(startDate)
          
          while (currentDate <= today) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
            const monthDisplay = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(currentDate)
            
            monthlyData[monthKey] = {
              month: monthDisplay,
              income: 0,
              expense: 0,
              net: 0
            }
            
            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1)
          }
          
          // Populate with actual data
          sortedTransactions.forEach(transaction => {
            const date = new Date(transaction.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            // Skip if month is before our range
            if (!monthlyData[monthKey]) return
            
            if (transaction.amount >= 0) {
              monthlyData[monthKey].income += transaction.amount
            } else {
              monthlyData[monthKey].expense += Math.abs(transaction.amount)
            }
            
            monthlyData[monthKey].net += transaction.amount
          })
          
          // Convert to array and ensure chronological order
          return Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, value]) => value)
        }
      }),
      { name: 'TransactionStore' }
    ),
    {
      name: 'transaction-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        pageSize: state.pageSize,
        currentPage: state.currentPage,
        // Don't persist transactions, they should be fetched from DB
      }),
      version: 1,
    }
  )
)

// Create optimized selector hooks for better performance
export const useTransactionSelectors = () => {
  // Using useShallow to optimize re-renders
  const currentPage = useTransactionStore(state => state.currentPage)
  const pageSize = useTransactionStore(state => state.pageSize)
  const totalPages = useTransactionStore(state => state.totalPages)
  const isLoading = useTransactionStore(state => state.isLoading)
  const error = useTransactionStore(state => state.error)
  const selectedTransactions = useTransactionStore(state => state.selectedTransactions)
  
  // Use a selector function for derived data
  const filteredTransactionCount = useTransactionStore(useShallow(state => {
    return state.getFilteredTransactions().length
  }))
  
  return {
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    error,
    selectedTransactions,
    filteredTransactionCount
  }
} 