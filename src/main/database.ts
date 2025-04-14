import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { 
  Transaction, 
  Category, 
  TransactionCreateInput, 
  TransactionUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput
} from './types';

// Import better-sqlite3 with CommonJS require
// @ts-ignore
const Database = require('better-sqlite3');

// Database path in user data folder
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'local-ledger.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Log database location in development
if (process.env.NODE_ENV === 'development') {
  console.log('Database location:', dbPath);
}

// Create/open database connection
let db: any;
try {
  db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : undefined });
  console.log('Connected to SQLite database at:', dbPath);
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Initialize database tables if they don't exist
function initTables() {
  // Create Transactions table (changed from Transaction to avoid reserved keyword)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT,
      amount REAL NOT NULL,
      isUnexpected INTEGER DEFAULT 0,
      sourceFile TEXT,
      categoryId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES Categories(id)
    )
  `);

  // Create Categories table (changed from Category to avoid reserved keyword)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transaction_date ON Transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transaction_categoryId ON Transactions(categoryId);
  `);
  
  // Run migrations
  migrateDatabase();
}

// Apply database migrations for schema changes
function migrateDatabase() {
  try {
    // Check if color column exists in Categories table
    const tableInfo = db.prepare("PRAGMA table_info(Categories)").all();
    const hasColorColumn = tableInfo.some(column => column.name === 'color');
    
    // Add color column if it doesn't exist
    if (!hasColorColumn) {
      console.log('Migrating Categories table: adding color column');
      db.exec('ALTER TABLE Categories ADD COLUMN color TEXT');
    }
  } catch (error) {
    console.error('Error during database migration:', error);
  }
}

// Initialize the database
export async function initDatabase(): Promise<boolean> {
  try {
    // Create tables if they don't exist
    initTables();
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Close database connection
export async function disconnectDatabase(): Promise<boolean> {
  try {
    db.close();
    console.log('Database disconnected successfully');
    return true;
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    return false;
  }
}

// Helper to generate a UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Format date for SQLite (ISO string)
function formatDate(date: Date): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

// Convert SQLite row to Transaction object
function rowToTransaction(row: any): Transaction {
  return {
    ...row,
    date: new Date(row.date),
    isUnexpected: !!row.isUnexpected, // Convert to boolean
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    // Don't try to fetch category here - it will be handled separately if needed
    category: null
  };
}

// Convert SQLite row to Category object
function rowToCategory(row: any): Category {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

// Helper to fetch transaction with category data
export async function getTransactionWithCategory(id: string): Promise<Transaction | null> {
  try {
    const transaction = await getTransactionById(id);
    if (!transaction) return null;
    
    if (transaction.categoryId) {
      // Only attempt to get category if categoryId exists
      const category = await getCategoryById(transaction.categoryId);
      if (category) {
        transaction.category = category;
      }
    }
    
    return transaction;
  } catch (error) {
    console.error(`Error getting transaction with category ${id}:`, error);
    throw error;
  }
}

// Transaction operations
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const rows = db.prepare('SELECT * FROM Transactions ORDER BY date DESC').all();
    const transactions = rows.map(rowToTransaction);
    
    // Load categories for transactions that have categoryId
    for (const transaction of transactions) {
      if (transaction.categoryId) {
        try {
          const category = db.prepare('SELECT * FROM Categories WHERE id = ?').get(transaction.categoryId);
          if (category) {
            transaction.category = rowToCategory(category);
          }
        } catch (err) {
          console.error(`Error loading category for transaction ${transaction.id}:`, err);
        }
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error getting all transactions:', error);
    throw error;
  }
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    const row = db.prepare('SELECT * FROM Transactions WHERE id = ?').get(id);
    if (!row) return null;
    
    const transaction = rowToTransaction(row);
    
    // Fetch category data if there's a categoryId
    if (transaction.categoryId) {
      try {
        const category = db.prepare('SELECT * FROM Categories WHERE id = ?').get(transaction.categoryId);
        if (category) {
          transaction.category = rowToCategory(category);
        }
      } catch (err) {
        console.error(`Error loading category for transaction ${id}:`, err);
      }
    }
    
    return transaction;
  } catch (error) {
    console.error(`Error getting transaction ${id}:`, error);
    throw error;
  }
}

export async function createTransaction(data: TransactionCreateInput): Promise<Transaction> {
  try {
    const now = new Date().toISOString();
    const id = generateUUID();
    
    console.log('Creating transaction:', { id, ...data });
    
    const stmt = db.prepare(`
      INSERT INTO Transactions (id, date, description, details, amount, isUnexpected, sourceFile, categoryId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      formatDate(data.date),
      data.description,
      data.details || null,
      data.amount,
      data.isUnexpected ? 1 : 0,
      data.sourceFile || null,
      data.categoryId || null,
      now,
      now
    );
    
    // Get the transaction and convert dates to strings for IPC serialization
    const newTransaction = await getTransactionById(id);
    if (!newTransaction) {
      throw new Error(`Failed to retrieve newly created transaction: ${id}`);
    }
    
    // Create a serializable version of the transaction for IPC
    const safeTransaction = {
      ...newTransaction,
      date: newTransaction.date instanceof Date ? newTransaction.date.toISOString() : newTransaction.date,
      createdAt: newTransaction.createdAt instanceof Date ? newTransaction.createdAt.toISOString() : newTransaction.createdAt,
      updatedAt: newTransaction.updatedAt instanceof Date ? newTransaction.updatedAt.toISOString() : newTransaction.updatedAt,
      category: newTransaction.category ? {
        ...newTransaction.category,
        createdAt: newTransaction.category.createdAt instanceof Date ? newTransaction.category.createdAt.toISOString() : newTransaction.category.createdAt,
        updatedAt: newTransaction.category.updatedAt instanceof Date ? newTransaction.category.updatedAt.toISOString() : newTransaction.category.updatedAt
      } : null
    };
    
    console.log('Created transaction successfully:', id);
    return safeTransaction as unknown as Transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransaction(id: string, data: TransactionUpdateInput): Promise<Transaction> {
  try {
    // First check if transaction exists
    const transaction = await getTransactionById(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(formatDate(data.date));
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.details !== undefined) {
      updates.push('details = ?');
      params.push(data.details);
    }
    
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      params.push(data.amount);
    }
    
    if (data.isUnexpected !== undefined) {
      updates.push('isUnexpected = ?');
      params.push(data.isUnexpected ? 1 : 0);
    }
    
    if (data.sourceFile !== undefined) {
      updates.push('sourceFile = ?');
      params.push(data.sourceFile);
    }
    
    if (data.categoryId !== undefined) {
      updates.push('categoryId = ?');
      params.push(data.categoryId);
    }
    
    // Add updatedAt
    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    
    // Add id to params
    params.push(id);
    
    // Execute update
    const updateQuery = `UPDATE Transactions SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...params);
    
    // Get the updated transaction with its category data
    const updatedTransaction = await getTransactionById(id);
    if (!updatedTransaction) {
      throw new Error(`Transaction not found after update: ${id}`);
    }
    
    // Create a simple serializable object without methods or circular references
    const safeTransaction = {
      ...updatedTransaction,
      date: updatedTransaction.date instanceof Date ? updatedTransaction.date.toISOString() : updatedTransaction.date,
      createdAt: updatedTransaction.createdAt instanceof Date ? updatedTransaction.createdAt.toISOString() : updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt instanceof Date ? updatedTransaction.updatedAt.toISOString() : updatedTransaction.updatedAt,
      category: updatedTransaction.category ? {
        ...updatedTransaction.category,
        createdAt: updatedTransaction.category.createdAt instanceof Date ? updatedTransaction.category.createdAt.toISOString() : updatedTransaction.category.createdAt,
        updatedAt: updatedTransaction.category.updatedAt instanceof Date ? updatedTransaction.category.updatedAt.toISOString() : updatedTransaction.category.updatedAt
      } : null
    };
    
    return safeTransaction as unknown as Transaction;
  } catch (error) {
    console.error(`Error updating transaction ${id}:`, error);
    throw error;
  }
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  try {
    // First get the transaction to return it
    const transaction = await getTransactionById(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    // Delete the transaction
    db.prepare('DELETE FROM Transactions WHERE id = ?').run(id);
    
    return transaction;
  } catch (error) {
    console.error(`Error deleting transaction ${id}:`, error);
    throw error;
  }
}

// Category operations
export async function getAllCategories(): Promise<Category[]> {
  try {
    const rows = db.prepare('SELECT * FROM Categories ORDER BY name').all();
    return rows.map(rowToCategory);
  } catch (error) {
    console.error('Error getting all categories:', error);
    throw error;
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const row = db.prepare('SELECT * FROM Categories WHERE id = ?').get(id);
    if (!row) return null;
    return rowToCategory(row);
  } catch (error) {
    console.error(`Error getting category ${id}:`, error);
    throw error;
  }
}

export async function createCategory(data: CategoryCreateInput): Promise<Category> {
  try {
    const now = new Date().toISOString();
    const id = generateUUID();
    
    const stmt = db.prepare(`
      INSERT INTO Categories (id, name, color, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.name,
      data.color || null,
      now,
      now
    );
    
    return getCategoryById(id) as Promise<Category>;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

export async function updateCategory(id: string, data: CategoryUpdateInput): Promise<Category> {
  try {
    // First check if category exists
    const category = await getCategoryById(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }
    
    // Update the category
    db.prepare(`
      UPDATE Categories
      SET name = ?, color = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      data.name || category.name,
      data.color !== undefined ? data.color : category.color,
      new Date().toISOString(),
      id
    );
    
    return getCategoryById(id) as Promise<Category>;
  } catch (error) {
    console.error(`Error updating category ${id}:`, error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<Category> {
  try {
    // First get the category to return it
    const category = await getCategoryById(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }
    
    // Check if any transactions use this category
    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM Transactions WHERE categoryId = ?').get(id).count;
    if (transactionCount > 0) {
      throw new Error(`Cannot delete category ${id} because it is used by ${transactionCount} transactions`);
    }
    
    // Delete the category
    db.prepare('DELETE FROM Categories WHERE id = ?').run(id);
    
    return category;
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error);
    throw error;
  }
}

// Export the database instance for direct access if needed
export default db; 

// Clear all data from the database for testing purposes
export async function clearDatabase(): Promise<boolean> {
  try {
    // Delete all data from tables
    db.prepare('DELETE FROM Transactions').run();
    db.prepare('DELETE FROM Categories').run();
    console.log('Database cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing database:', error);
    return false;
  }
} 