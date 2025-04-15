import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Transaction } from '../lib/types'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// Types for filter parameters
export interface DateRange {
  from?: Date | null
  to?: Date | null
}

export interface TransactionFilters {
  search: string
  dateRange: DateRange
  categories: string[]
  minAmount: number | null
  maxAmount: number | null
  onlyUnexpected: boolean
  sortBy: 'date' | 'amount' | 'description' | 'category'
  sortDirection: 'asc' | 'desc'
}

interface FilterState {
  filters: TransactionFilters
  
  // Actions
  setSearchQuery: (query: string) => void
  setDateRange: (range: DateRange) => void
  setCategoryFilters: (categoryIds: string[]) => void
  setAmountRange: (min: number | null, max: number | null) => void
  toggleUnexpectedFilter: (value?: boolean) => void
  setSortBy: (field: TransactionFilters['sortBy']) => void
  setSortDirection: (direction: TransactionFilters['sortDirection']) => void
  resetFilters: () => void
  
  // Complex selectors
  applyFilters: (transactions: Transaction[]) => Transaction[]
  getFilteredAndSortedTransactions: (transactions: Transaction[]) => Transaction[]
  getFilterSummary: () => string
  hasActiveFilters: () => boolean
}

// Default/initial filter state
const defaultFilters: TransactionFilters = {
  search: '',
  dateRange: { from: null, to: null },
  categories: [],
  minAmount: null,
  maxAmount: null,
  onlyUnexpected: false,
  sortBy: 'date',
  sortDirection: 'desc'
}

export const useFilterStore = create<FilterState>()(
  persist(
    devtools(
      (set, get) => ({
        filters: defaultFilters,
        
        // Set search query
        setSearchQuery: (query) => {
          set(state => ({
            filters: { ...state.filters, search: query }
          }))
        },
        
        // Set date range
        setDateRange: (range) => {
          set(state => ({
            filters: { ...state.filters, dateRange: range }
          }))
        },
        
        // Set category filters
        setCategoryFilters: (categoryIds) => {
          set(state => ({
            filters: { ...state.filters, categories: categoryIds }
          }))
        },
        
        // Set amount range
        setAmountRange: (min, max) => {
          set(state => ({
            filters: { 
              ...state.filters, 
              minAmount: min,
              maxAmount: max 
            }
          }))
        },
        
        // Toggle unexpected filter
        toggleUnexpectedFilter: (value) => {
          set(state => ({
            filters: { 
              ...state.filters, 
              onlyUnexpected: value !== undefined 
                ? value 
                : !state.filters.onlyUnexpected 
            }
          }))
        },
        
        // Set sort field
        setSortBy: (field) => {
          set(state => ({
            filters: { ...state.filters, sortBy: field }
          }))
        },
        
        // Set sort direction
        setSortDirection: (direction) => {
          set(state => ({
            filters: { ...state.filters, sortDirection: direction }
          }))
        },
        
        // Reset all filters to defaults
        resetFilters: () => {
          set({ filters: defaultFilters })
        },
        
        // Apply all filters to a transaction list (without sorting)
        applyFilters: (transactions) => {
          const { filters } = get()
          
          return transactions.filter(transaction => {
            // Text search filter
            if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
              return false
            }
            
            // Date range filter
            if (filters.dateRange.from && new Date(transaction.date) < filters.dateRange.from) {
              return false
            }
            if (filters.dateRange.to && new Date(transaction.date) > filters.dateRange.to) {
              return false
            }
            
            // Category filter
            if (filters.categories.length > 0 && 
              (!transaction.categoryId || !filters.categories.includes(transaction.categoryId))) {
              return false
            }
            
            // Amount range filter
            if (filters.minAmount !== null && transaction.amount < filters.minAmount) {
              return false
            }
            if (filters.maxAmount !== null && transaction.amount > filters.maxAmount) {
              return false
            }
            
            // Unexpected filter
            if (filters.onlyUnexpected && !transaction.isUnexpected) {
              return false
            }
            
            return true
          })
        },
        
        // Apply filters and sorting
        getFilteredAndSortedTransactions: (transactions) => {
          const { filters } = get()
          const filtered = get().applyFilters(transactions)
          
          // Apply sorting
          return [...filtered].sort((a, b) => {
            let comparison = 0
            
            switch (filters.sortBy) {
              case 'date':
                // Compare dates - for dates we want newest (later) dates first in descending order
                comparison = new Date(b.date).getTime() - new Date(a.date).getTime()
                break
              case 'amount':
                comparison = a.amount - b.amount
                break
              case 'description':
                comparison = a.description.localeCompare(b.description)
                break
              case 'category':
                // Sort by category name, handling null categories
                const catA = a.category?.name || ''
                const catB = b.category?.name || ''
                comparison = catA.localeCompare(catB)
                break
            }
            
            // Apply sort direction - for dates we've inverted the comparison already,
            // so ascending means oldest first and descending means newest first
            return filters.sortBy === 'date'
              ? (filters.sortDirection === 'asc' ? -comparison : comparison)
              : (filters.sortDirection === 'asc' ? comparison : -comparison)
          })
        },
        
        // Get human-readable summary of active filters
        getFilterSummary: () => {
          const { filters } = get()
          const parts: string[] = []
          
          if (filters.search) {
            parts.push(`Search: "${filters.search}"`)
          }
          
          if (filters.dateRange.from || filters.dateRange.to) {
            let dateRange = 'Date: '
            if (filters.dateRange.from) {
              dateRange += new Date(filters.dateRange.from).toLocaleDateString()
            } else {
              dateRange += 'Any'
            }
            
            dateRange += ' to '
            
            if (filters.dateRange.to) {
              dateRange += new Date(filters.dateRange.to).toLocaleDateString()
            } else {
              dateRange += 'Any'
            }
            
            parts.push(dateRange)
          }
          
          if (filters.categories.length > 0) {
            parts.push(`Categories: ${filters.categories.length} selected`)
          }
          
          if (filters.minAmount !== null || filters.maxAmount !== null) {
            let amountRange = 'Amount: '
            if (filters.minAmount !== null) {
              amountRange += `$${filters.minAmount}`
            } else {
              amountRange += 'Any'
            }
            
            amountRange += ' to '
            
            if (filters.maxAmount !== null) {
              amountRange += `$${filters.maxAmount}`
            } else {
              amountRange += 'Any'
            }
            
            parts.push(amountRange)
          }
          
          if (filters.onlyUnexpected) {
            parts.push('Only Unexpected')
          }
          
          if (parts.length === 0) {
            return 'No filters applied'
          }
          
          return parts.join(' • ')
        },
        
        // Check if any filters are currently active
        hasActiveFilters: () => {
          const { filters } = get()
          
          return (
            !!filters.search ||
            !!filters.dateRange.from ||
            !!filters.dateRange.to ||
            filters.categories.length > 0 ||
            filters.minAmount !== null ||
            filters.maxAmount !== null ||
            filters.onlyUnexpected
          )
        }
      }),
      { name: 'FilterStore' }
    ),
    {
      name: 'filter-store',
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
)

// Create optimized selector hooks for better performance
export const useFilterSelectors = () => {
  const filters = useFilterStore(state => state.filters)
  
  // Create memoized selectors for derived values
  const hasFilters = useFilterStore(useShallow(state => state.hasActiveFilters()))
  const filterSummary = useFilterStore(useShallow(state => state.getFilterSummary()))

  // Individual filter values for components that only need specific parts
  const searchQuery = useFilterStore(state => state.filters.search)
  const dateRange = useFilterStore(state => state.filters.dateRange)
  const categoryFilters = useFilterStore(state => state.filters.categories)
  const amountRange = useFilterStore(useShallow(state => ({
    min: state.filters.minAmount,
    max: state.filters.maxAmount
  })))
  const sortSettings = useFilterStore(useShallow(state => ({
    sortBy: state.filters.sortBy,
    sortDirection: state.filters.sortDirection
  })))
  
  return {
    filters,
    hasFilters,
    filterSummary,
    searchQuery,
    dateRange,
    categoryFilters,
    amountRange,
    sortSettings
  }
} 