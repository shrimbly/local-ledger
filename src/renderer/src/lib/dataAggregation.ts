/**
 * Utility functions for transaction data aggregation and analysis
 */

import { Transaction, Category } from './types'

interface AggregatedCategory {
  id: string
  name: string
  color?: string
  totalAmount: number
  transactionCount: number
  percentage: number
}

interface AggregatedTransactionData {
  totalIncome: number
  totalExpenses: number
  netAmount: number
  topExpenseCategories: AggregatedCategory[]
  topIncomeCategories: AggregatedCategory[]
  transactionsByMonth: Record<string, {
    income: number
    expenses: number
    count: number
  }>
  uncategorizedAmount: number
  uncategorizedCount: number
  averageTransactionAmount: number
  largestExpense: Transaction | null
  largestIncome: Transaction | null
  unexpectedTransactions: Transaction[]
}

/**
 * Filters transactions based on a date range
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  timeFilter: 'all' | 'month' | 'year'
): Transaction[] {
  if (!transactions.length) return []

  const now = new Date()
  const startDate = new Date()
  
  if (timeFilter === 'month') {
    startDate.setDate(now.getDate() - 30)
  } else if (timeFilter === 'year') {
    startDate.setFullYear(now.getFullYear() - 1)
  } else {
    // All time - no filtering needed
    return transactions
  }

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date)
    return transactionDate >= startDate && transactionDate <= now
  })
}

/**
 * Aggregates transaction data for analysis
 */
export function aggregateTransactionData(
  transactions: Transaction[],
  categories: Category[]
): AggregatedTransactionData {
  // Initialize results
  const result: AggregatedTransactionData = {
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    topExpenseCategories: [],
    topIncomeCategories: [],
    transactionsByMonth: {},
    uncategorizedAmount: 0,
    uncategorizedCount: 0,
    averageTransactionAmount: 0,
    largestExpense: null,
    largestIncome: null,
    unexpectedTransactions: []
  }

  if (!transactions.length) return result

  // Initialize category aggregation
  const expensesByCategory: Record<string, {
    id: string,
    name: string,
    color?: string,
    totalAmount: number,
    transactionCount: number
  }> = {}
  
  const incomeByCategory: Record<string, {
    id: string,
    name: string,
    color?: string,
    totalAmount: number,
    transactionCount: number
  }> = {}

  // Process each transaction
  transactions.forEach(transaction => {
    const amount = transaction.amount
    const absAmount = Math.abs(amount)
    
    // Track largest transactions
    if (amount < 0) {
      result.totalExpenses += absAmount
      
      if (!result.largestExpense || absAmount > Math.abs(result.largestExpense.amount)) {
        result.largestExpense = transaction
      }
    } else {
      result.totalIncome += amount
      
      if (!result.largestIncome || amount > result.largestIncome.amount) {
        result.largestIncome = transaction
      }
    }
    
    // Track unexpected transactions
    if (transaction.isUnexpected) {
      result.unexpectedTransactions.push(transaction)
    }
    
    // Group by category
    const category = transaction.category || transaction.categoryId 
      ? categories.find(c => c.id === transaction.categoryId)
      : null
    
    if (!category) {
      result.uncategorizedCount++
      result.uncategorizedAmount += absAmount
    } else {
      const categoryMap = amount < 0 ? expensesByCategory : incomeByCategory
      const categoryId = category.id
      
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          name: category.name,
          color: category.color || undefined,
          totalAmount: 0,
          transactionCount: 0
        }
      }
      
      categoryMap[categoryId].totalAmount += absAmount
      categoryMap[categoryId].transactionCount++
    }
    
    // Group by month
    const date = new Date(transaction.date)
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    
    if (!result.transactionsByMonth[monthKey]) {
      result.transactionsByMonth[monthKey] = {
        income: 0,
        expenses: 0,
        count: 0
      }
    }
    
    if (amount < 0) {
      result.transactionsByMonth[monthKey].expenses += absAmount
    } else {
      result.transactionsByMonth[monthKey].income += amount
    }
    
    result.transactionsByMonth[monthKey].count++
  })
  
  // Calculate net amount
  result.netAmount = result.totalIncome - result.totalExpenses
  
  // Calculate average transaction amount
  result.averageTransactionAmount = transactions.length
    ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
    : 0
  
  // Convert categories to sorted arrays with percentages
  const expenseCategoryEntries = Object.values(expensesByCategory)
  const incomeCategoryEntries = Object.values(incomeByCategory)
  
  // Calculate percentages and sort
  if (result.totalExpenses > 0) {
    result.topExpenseCategories = expenseCategoryEntries
      .map(cat => ({
        ...cat,
        percentage: (cat.totalAmount / result.totalExpenses) * 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
  }
  
  if (result.totalIncome > 0) {
    result.topIncomeCategories = incomeCategoryEntries
      .map(cat => ({
        ...cat,
        percentage: (cat.totalAmount / result.totalIncome) * 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
  }
  
  return result
}

/**
 * Prepares transaction data for AI analysis
 */
export function prepareTransactionsForAiAnalysis(
  transactions: Transaction[],
  categories: Category[]
): any {
  // Filter and limit to reasonable number of transactions to prevent token limit issues
  const limitedTransactions = transactions.slice(0, 50)
  
  return limitedTransactions.map(transaction => {
    const category = categories.find(c => c.id === transaction.categoryId)
    
    return {
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: category?.name || 'Uncategorized',
      isUnexpected: transaction.isUnexpected || false,
      details: transaction.details || undefined
    }
  })
}

/**
 * Formats aggregated data into human-readable text
 */
export function formatAggregatedDataSummary(data: AggregatedTransactionData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', 
      currency: 'USD'
    }).format(amount)
  }
  
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }
  
  let summary = `# Financial Summary\n\n`
  
  // Overall numbers
  summary += `Total Income: ${formatCurrency(data.totalIncome)}\n`
  summary += `Total Expenses: ${formatCurrency(data.totalExpenses)}\n`
  summary += `Net Amount: ${formatCurrency(data.netAmount)}\n\n`
  
  // Top expense categories
  if (data.topExpenseCategories.length > 0) {
    summary += `## Top Expense Categories\n`
    data.topExpenseCategories.forEach(category => {
      summary += `- ${category.name}: ${formatCurrency(category.totalAmount)} (${formatPercentage(category.percentage)})\n`
    })
    summary += `\n`
  }
  
  // Top income categories
  if (data.topIncomeCategories.length > 0) {
    summary += `## Top Income Categories\n`
    data.topIncomeCategories.forEach(category => {
      summary += `- ${category.name}: ${formatCurrency(category.totalAmount)} (${formatPercentage(category.percentage)})\n`
    })
    summary += `\n`
  }
  
  // Unexpected transactions
  if (data.unexpectedTransactions.length > 0) {
    summary += `## Unexpected Transactions\n`
    summary += `There are ${data.unexpectedTransactions.length} unexpected transactions totaling ${
      formatCurrency(data.unexpectedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))
    }.\n\n`
  }
  
  // Uncategorized transactions
  if (data.uncategorizedCount > 0) {
    summary += `## Uncategorized Transactions\n`
    summary += `There are ${data.uncategorizedCount} uncategorized transactions totaling ${
      formatCurrency(data.uncategorizedAmount)
    }.\n\n`
  }
  
  return summary
} 