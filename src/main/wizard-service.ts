import { ipcMain } from 'electron';
import { getUncategorizedTransactions, getUncategorizedTransactionsCount, updateTransaction } from './database';
import type { Transaction } from './types';

/*
 * NOTE: These handlers are commented out to prevent duplicate registrations.
 * The main index.ts file now manages all IPC handlers.
 */

/*
// IPC handler for getting uncategorized transactions
ipcMain.handle('wizard:getUncategorizedTransactions', async (): Promise<Transaction[]> => {
  try {
    const transactions = await getUncategorizedTransactions();
    return transactions;
  } catch (error) {
    console.error('Error in wizard:getUncategorizedTransactions:', error);
    throw error;
  }
});

// IPC handler for getting uncategorized transactions count
ipcMain.handle('wizard:getUncategorizedCount', async (): Promise<number> => {
  try {
    const count = await getUncategorizedTransactionsCount();
    return count;
  } catch (error) {
    console.error('Error in wizard:getUncategorizedCount:', error);
    throw error;
  }
});

// IPC handler for saving transaction categorization
ipcMain.handle('wizard:saveTransactionCategory', async (_, transactionId: string, categoryId: string | null): Promise<Transaction> => {
  try {
    const updatedTransaction = await updateTransaction(transactionId, { categoryId });
    return updatedTransaction;
  } catch (error) {
    console.error('Error in wizard:saveTransactionCategory:', error);
    throw error;
  }
});

// IPC handler for skipping a transaction (marks it as reviewed without category)
ipcMain.handle('wizard:skipTransaction', async (_, transactionId: string): Promise<Transaction> => {
  try {
    // Update the transaction with a special flag to indicate it was intentionally skipped
    const updatedTransaction = await updateTransaction(transactionId, {
      isSkipped: true,
      reviewedAt: new Date().toISOString()
    });
    return updatedTransaction;
  } catch (error) {
    console.error('Error in wizard:skipTransaction:', error);
    throw error;
  }
});
*/

// Export the functions instead, so they can be used by index.ts
export const wizardService = {
  async getUncategorizedTransactions(): Promise<Transaction[]> {
    try {
      const transactions = await getUncategorizedTransactions();
      return transactions;
    } catch (error) {
      console.error('Error getting uncategorized transactions:', error);
      throw error;
    }
  },
  
  async getUncategorizedCount(): Promise<number> {
    try {
      const count = await getUncategorizedTransactionsCount();
      return count;
    } catch (error) {
      console.error('Error getting uncategorized count:', error);
      throw error;
    }
  },
  
  async saveTransactionCategory(transactionId: string, categoryId: string | null): Promise<Transaction> {
    try {
      const updatedTransaction = await updateTransaction(transactionId, { categoryId });
      return updatedTransaction;
    } catch (error) {
      console.error('Error saving transaction category:', error);
      throw error;
    }
  },
  
  async skipTransaction(transactionId: string): Promise<Transaction> {
    try {
      const updatedTransaction = await updateTransaction(transactionId, {
        isSkipped: true,
        reviewedAt: new Date().toISOString()
      });
      return updatedTransaction;
    } catch (error) {
      console.error('Error skipping transaction:', error);
      throw error;
    }
  }
}; 