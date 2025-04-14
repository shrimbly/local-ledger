import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import fs from 'fs'

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
  updateCategory,
  deleteCategory,
  initDatabase,
  disconnectDatabase,
  clearDatabase
} from './database'

// Import types
import { 
  TransactionCreateInput, 
  TransactionUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  TransactionCreateInputArray
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
}

// Set up IPC handlers for database operations
function setupIpcHandlers(): void {
  // Transaction handlers
  ipcMain.handle('get-transactions', async () => {
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

  // Set up IPC handlers for database operations
  setupIpcHandlers()

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
