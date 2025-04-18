import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import fs from 'fs'

// Import keytar service
import { KeytarService, ApiKeyType } from './keytar-service'
// Import Gemini service
import { GeminiService } from './gemini-service'
// Import wizard service
import { wizardService } from './wizard-service'

// Set NODE_ENV for development/production detection
process.env.NODE_ENV = is.dev ? 'development' : 'production';

// Get user data path for storing the database
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'local-ledger.db')

// Set environment variable only for compatibility, not used with better-sqlite3
process.env.DATABASE_URL = `file:${dbPath}`

// Now import the database module
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAllCategories,
  getCategoryById,
  createCategory,
  createCategories,
  updateCategory,
  deleteCategory,
  initDatabase,
  disconnectDatabase,
  clearDatabase,
  getAllCategorizationRules,
  getCategorizationRuleById,
  getCategorizationRulesByCategory,
  createCategorizationRule,
  updateCategorizationRule,
  deleteCategorizationRule,
  applyCategorizationRules,
  getUncategorizedTransactions,
  getUncategorizedTransactionsCount
} from './database'

// Import types
import { 
  TransactionCreateInput, 
  TransactionUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  TransactionCreateInputArray,
  CategorizationRuleCreateInput,
  CategorizationRuleUpdateInput
} from './types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Enable DevTools in development
      devTools: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Always open DevTools in development mode and if requested by command line
    if (is.dev || process.argv.includes('--open-devtools')) {
      console.log('Open dev tool...')
      mainWindow.webContents.openDevTools({ mode: 'right' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Register IPC handlers
  setupIPC()
}

// Set up IPC handlers for database operations
function setupIPC(): void {
  console.log('[IPC] Setting up IPC handlers...')

  // Transaction handlers
  ipcMain.handle('get-transactions', async () => {
    console.log('[IPC] Handling get-transactions request')
    try {
      return await getAllTransactions()
    } catch (error) {
      console.error('Error getting transactions:', error)
      throw error
    }
  })

  ipcMain.handle('get-transaction', async (_, id: string) => {
    try {
      return await getTransactionById(id)
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error)
      throw error
    }
  })

  ipcMain.handle('create-transaction', async (_, data: TransactionCreateInputArray) => {
    try {
      // Support for array of transactions (batch insert)
      if (Array.isArray(data)) {
        const results: any[] = []
        for (const item of data) {
          const result = await createTransaction(item)
          results.push(result)
        }
        return results
      }
      // Single transaction creation
      return await createTransaction(data)
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw error
    }
  })

  ipcMain.handle('update-transaction', async (_, id: string, data: TransactionUpdateInput) => {
    try {
      return await updateTransaction(id, data)
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error)
      throw error
    }
  })

  ipcMain.handle('delete-transaction', async (_, id: string) => {
    try {
      return await deleteTransaction(id)
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error)
      throw error
    }
  })

  // Category handlers
  ipcMain.handle('get-categories', async () => {
    try {
      return await getAllCategories()
    } catch (error) {
      console.error('Error getting categories:', error)
      throw error
    }
  })

  ipcMain.handle('get-category', async (_, id: string) => {
    try {
      return await getCategoryById(id)
    } catch (error) {
      console.error(`Error getting category ${id}:`, error)
      throw error
    }
  })

  ipcMain.handle('create-category', async (_, data: CategoryCreateInput) => {
    try {
      return await createCategory(data)
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  })

  ipcMain.handle('create-categories', async (_, data: CategoryCreateInput[]) => {
    try {
      return await createCategories(data)
    } catch (error) {
      console.error('Error creating categories:', error)
      throw error
    }
  })

  ipcMain.handle('update-category', async (_, id: string, data: CategoryUpdateInput) => {
    try {
      return await updateCategory(id, data)
    } catch (error) {
      console.error(`Error updating category ${id}:`, error)
      throw error
    }
  })

  ipcMain.handle('delete-category', async (_, id: string) => {
    try {
      return await deleteCategory(id)
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error)
      throw error
    }
  })

  // Database management handlers
  ipcMain.handle('clear-database', async () => {
    try {
      return await clearDatabase()
    } catch (error) {
      console.error('Error clearing database:', error)
      throw error
    }
  })

  // Categorization Rule handlers
  ipcMain.handle('categorization-rule:getAll', async () => {
    return await getAllCategorizationRules()
  })

  ipcMain.handle('categorization-rule:getById', async (_, id: string) => {
    return await getCategorizationRuleById(id)
  })

  ipcMain.handle('categorization-rule:getByCategory', async (_, categoryId: string) => {
    return await getCategorizationRulesByCategory(categoryId)
  })

  ipcMain.handle('categorization-rule:create', async (_, data: CategorizationRuleCreateInput) => {
    return await createCategorizationRule(data)
  })

  ipcMain.handle('categorization-rule:update', async (_, id: string, data: CategorizationRuleUpdateInput) => {
    return await updateCategorizationRule(id, data)
  })

  ipcMain.handle('categorization-rule:delete', async (_, id: string) => {
    return await deleteCategorizationRule(id)
  })

  ipcMain.handle('categorization-rule:apply', async (_, transaction: TransactionCreateInput) => {
    return await applyCategorizationRules(transaction as any)
  })

  // API Key management handlers
  ipcMain.handle('api-key:store', async (_, type: string, key: string) => {
    try {
      return await KeytarService.storeApiKey(type as ApiKeyType, key)
    } catch (error) {
      console.error(`Error storing API key for ${type}:`, error)
      throw error
    }
  })

  ipcMain.handle('api-key:get', async (_, type: string) => {
    try {
      return await KeytarService.getApiKey(type as ApiKeyType)
    } catch (error) {
      console.error(`Error getting API key for ${type}:`, error)
      throw error
    }
  })

  ipcMain.handle('api-key:delete', async (_, type: string) => {
    try {
      return await KeytarService.deleteApiKey(type as ApiKeyType)
    } catch (error) {
      console.error(`Error deleting API key for ${type}:`, error)
      throw error
    }
  })

  ipcMain.handle('api-key:exists', async (_, type: string) => {
    try {
      return await KeytarService.hasApiKey(type as ApiKeyType)
    } catch (error) {
      console.error(`Error checking if API key exists for ${type}:`, error)
      throw error
    }
  })

  // Gemini API handlers
  ipcMain.handle('gemini:initialize', async () => {
    console.log('[IPC] Handling gemini:initialize request')
    try {
      return await GeminiService.initialize()
    } catch (error) {
      console.error('Error initializing Gemini:', error)
      throw error
    }
  })

  ipcMain.handle('gemini:is-initialized', () => {
    console.log('[IPC] Handling gemini:is-initialized request')
    return GeminiService.isInitialized()
  })

  ipcMain.handle('gemini:suggest-category', async (_, description: string, amount: number, details?: string, existingCategories?: string[]) => {
    console.log('[IPC] Handling gemini:suggest-category request for:', description)
    try {
      return await GeminiService.suggestCategory(description, amount, details, existingCategories)
    } catch (error) {
      console.error('Error suggesting category:', error)
      throw error
    }
  })

  ipcMain.handle('gemini:analyze-transactions', async (_, data: any) => {
    try {
      return await GeminiService.analyzeTransactions(data)
    } catch (error) {
      console.error('Error analyzing transactions:', error)
      throw error
    }
  })

  // Wizard handlers for direct access (without wizard: prefix)
  ipcMain.handle('get-uncategorized-transactions', async () => {
    try {
      // Use the wizardService instead of calling the database function directly
      return await wizardService.getUncategorizedTransactions()
    } catch (error) {
      console.error('Error getting uncategorized transactions:', error)
      throw error
    }
  })

  ipcMain.handle('get-uncategorized-count', async () => {
    try {
      // Use the wizardService instead of calling the database function directly
      return await wizardService.getUncategorizedCount()
    } catch (error) {
      console.error('Error getting uncategorized count:', error)
      throw error
    }
  })

  // Add handlers for the wizard-specific endpoints
  ipcMain.handle('wizard:saveTransactionCategory', async (_, transactionId: string, categoryId: string | null) => {
    try {
      return await wizardService.saveTransactionCategory(transactionId, categoryId)
    } catch (error) {
      console.error('Error saving transaction category:', error)
      throw error
    }
  })

  ipcMain.handle('wizard:skipTransaction', async (_, transactionId: string) => {
    try {
      return await wizardService.skipTransaction(transactionId)
    } catch (error) {
      console.error('Error skipping transaction:', error)
      throw error
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize database
  try {
    await initDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Disconnect database when app is quitting
app.on('quit', async () => {
  try {
    await disconnectDatabase()
    console.log('Database disconnected successfully')
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
