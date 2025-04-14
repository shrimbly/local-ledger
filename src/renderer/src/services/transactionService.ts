import { Transaction, TransactionCreateInput, TransactionUpdateInput } from '../lib/types'

// Format transaction data received from IPC
function formatTransactionData(transaction: any): Transaction {
  if (!transaction) {
    console.error('Received null or undefined transaction to format');
    throw new Error('Cannot format null or undefined transaction');
  }
  
  console.log('Formatting transaction:', transaction.id);
  
  // Debug the date value
  const rawDate = transaction.date;
  const parsedDate = typeof rawDate === 'string' ? new Date(rawDate) : rawDate;
  
  console.log('Transaction date debug:', {
    id: transaction.id.substring(0, 8),
    rawDate,
    parsedDate,
    parsedTime: parsedDate instanceof Date ? parsedDate.getTime() : 'not a date',
    isValidDate: parsedDate instanceof Date && !isNaN(parsedDate.getTime())
  });
  
  // Create a safe copy with properly formatted dates
  const formatted = {
    ...transaction,
    // Convert string dates to Date objects
    date: parsedDate,
    createdAt: typeof transaction.createdAt === 'string' ? new Date(transaction.createdAt) : transaction.createdAt,
    updatedAt: typeof transaction.updatedAt === 'string' ? new Date(transaction.updatedAt) : transaction.updatedAt
  };
  
  // Format category dates if present
  if (formatted.category) {
    formatted.category = {
      ...formatted.category,
      createdAt: typeof formatted.category.createdAt === 'string' ? new Date(formatted.category.createdAt) : formatted.category.createdAt,
      updatedAt: typeof formatted.category.updatedAt === 'string' ? new Date(formatted.category.updatedAt) : formatted.category.updatedAt
    };
  }
  
  return formatted;
}

// Get all transactions
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    console.log('Fetching all transactions via IPC...')
    const transactions = await window.database.transactions.getAll()
    console.log('Raw transactions from IPC:', transactions ? transactions.length : 'none')
    
    if (!transactions || !Array.isArray(transactions)) {
      console.error('Received invalid transactions data:', transactions);
      return [];
    }
    
    const formattedTransactions = transactions.map(formatTransactionData)
    console.log('Formatted transactions:', formattedTransactions.length)
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
    console.log('Creating transaction via IPC:', data);
    const transaction = await window.database.transactions.create(data)
    console.log('Transaction creation response:', transaction);
    
    if (!transaction) {
      console.error('Received null response from create transaction');
      throw new Error('Failed to create transaction - received null response');
    }
    
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