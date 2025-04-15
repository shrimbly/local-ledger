import { Transaction, TransactionCreateInput, TransactionUpdateInput } from '../lib/types'
import { applyCategoryRules } from './categorizationRuleService'

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

// Function to check if a transaction with same date and amount already exists
async function isDuplicate(data: TransactionCreateInput): Promise<boolean> {
  try {
    // Get the date string in ISO format for comparison
    const dateString = data.date.toISOString().split('T')[0]; // Get just the YYYY-MM-DD part
    
    // Get all transactions
    const allTransactions = await getAllTransactions();
    
    // Check if any transaction has the same date and amount
    return allTransactions.some(transaction => {
      // Get the date string in same format
      const existingDateString = transaction.date.toISOString().split('T')[0];
      
      // Match on date and amount only
      return existingDateString === dateString && 
             transaction.amount === data.amount;
    });
  } catch (error) {
    console.error('Error checking for duplicate transaction:', error);
    return false; // Fail open - if we can't check, we'll create anyway
  }
}

// Create new transaction
export async function createTransaction(data: TransactionCreateInput): Promise<Transaction> {
  try {
    console.log('Creating transaction via IPC:', data);
    
    // Check if this transaction already exists in the database
    const duplicate = await isDuplicate(data);
    if (duplicate) {
      console.log('Skipping duplicate transaction:', data);
      // Create a "fake" transaction for the return value that includes the properties
      // needed by the caller, but don't actually save it to the database
      return {
        id: 'skipped-duplicate',
        date: data.date,
        description: data.description,
        details: data.details || null,
        amount: data.amount,
        isUnexpected: data.isUnexpected || false,
        sourceFile: data.sourceFile || null,
        categoryId: data.categoryId || null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Apply categorization rules if category is not specified
    if (data.categoryId === undefined || data.categoryId === null) {
      // Create temporary transaction object to check against rules
      const tempTransaction: Transaction = {
        id: 'temp',
        date: data.date,
        description: data.description,
        details: data.details || null,
        amount: data.amount,
        isUnexpected: data.isUnexpected || false,
        sourceFile: data.sourceFile || null,
        categoryId: null,
        category: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Try to find a category using rules
      const matchedCategoryId = await applyCategoryRules(tempTransaction);
      if (matchedCategoryId) {
        console.log(`Applied categorization rule - assigned category: ${matchedCategoryId}`);
        data.categoryId = matchedCategoryId;
      }
    }
    
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
    const results: Transaction[] = [];
    
    // Process each transaction individually to apply duplicate checking
    for (const item of data) {
      try {
        const transaction = await createTransaction(item);
        results.push(transaction);
      } catch (err) {
        console.error('Error creating individual transaction:', err);
        // Continue with other transactions even if one fails
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error creating transactions:', error);
    throw error;
  }
}

// Update transaction
export async function updateTransaction(id: string, data: TransactionUpdateInput): Promise<Transaction> {
  try {
    // Apply categorization rules if the category is being explicitly set to null
    if ('categoryId' in data && (data.categoryId === null || data.categoryId === undefined)) {
      // Get the current transaction to apply rules on
      const currentTransaction = await getTransactionById(id);
      if (currentTransaction) {
        // Apply the updates to create a temp transaction object
        const tempTransaction: Transaction = {
          ...currentTransaction,
          ...data,
          // Ensure we maintain the ID
          id: currentTransaction.id
        };
        
        // Try to find a category using rules
        const matchedCategoryId = await applyCategoryRules(tempTransaction);
        if (matchedCategoryId) {
          console.log(`Applied categorization rule - assigned category: ${matchedCategoryId}`);
          data.categoryId = matchedCategoryId;
        }
      }
    }
    
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