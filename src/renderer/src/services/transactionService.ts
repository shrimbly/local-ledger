import { Transaction, TransactionCreateInput, TransactionUpdateInput } from '../lib/types'

// Format transaction data received from IPC
function formatTransactionData(transaction: any): Transaction {
  return {
    ...transaction,
    // Ensure date is a Date object
    date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date)
  }
}

// Get all transactions
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    console.log('Fetching all transactions via IPC...')
    const transactions = await window.database.transactions.getAll()
    console.log('Raw transactions from IPC:', transactions)
    const formattedTransactions = transactions.map(formatTransactionData)
    console.log('Formatted transactions:', formattedTransactions)
    return formattedTransactions
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
}

// Get transaction by ID
export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    const transaction = await window.database.transactions.getById(id)
    if (!transaction) return null
    return formatTransactionData(transaction)
  } catch (error) {
    console.error(`Error fetching transaction ${id}:`, error)
    throw error
  }
}

// Create new transaction
export async function createTransaction(data: TransactionCreateInput): Promise<Transaction> {
  try {
    const transaction = await window.database.transactions.create(data)
    return formatTransactionData(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
}

// Create multiple transactions
export async function createTransactions(data: TransactionCreateInput[]): Promise<Transaction[]> {
  try {
    const transactions = await window.database.transactions.create(data)
    return transactions.map(formatTransactionData)
  } catch (error) {
    console.error('Error creating transactions:', error)
    throw error
  }
}

// Update transaction
export async function updateTransaction(id: string, data: TransactionUpdateInput): Promise<Transaction> {
  try {
    const transaction = await window.database.transactions.update(id, data)
    return formatTransactionData(transaction)
  } catch (error) {
    console.error(`Error updating transaction ${id}:`, error)
    throw error
  }
}

// Delete transaction
export async function deleteTransaction(id: string): Promise<void> {
  try {
    await window.database.transactions.delete(id)
  } catch (error) {
    console.error(`Error deleting transaction ${id}:`, error)
    throw error
  }
} 