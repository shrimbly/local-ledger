import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Helper function for logging IPC calls
const loggedInvoke = async (channel: string, ...args: any[]) => {
  console.log(`[IPC-Renderer] Calling ${channel} with:`, ...args)
  try {
    const result = await ipcRenderer.invoke(channel, ...args)
    console.log(`[IPC-Renderer] ${channel} response:`, result)
    return result
  } catch (error) {
    console.error(`[IPC-Renderer] Error in ${channel}:`, error)
    throw error
  }
}

// Custom APIs for renderer
const api = {
  // Transaction methods
  transactions: {
    getAll: () => loggedInvoke('get-transactions'),
    getById: (id: string) => loggedInvoke('get-transaction', id),
    create: (data: any) => loggedInvoke('create-transaction', data),
    update: (id: string, data: any) => loggedInvoke('update-transaction', id, data),
    delete: (id: string) => loggedInvoke('delete-transaction', id)
  },
  
  // Category methods
  categories: {
    getAll: () => ipcRenderer.invoke('get-categories'),
    getById: (id: string) => ipcRenderer.invoke('get-category', id),
    create: (data: any) => ipcRenderer.invoke('create-category', data),
    createBulk: (data: any[]) => ipcRenderer.invoke('create-categories', data),
    update: (id: string, data: any) => ipcRenderer.invoke('update-category', id, data),
    delete: (id: string) => ipcRenderer.invoke('delete-category', id)
  },
  
  // Categorization Rule methods
  categorizationRules: {
    getAll: () => ipcRenderer.invoke('categorization-rule:getAll'),
    getById: (id: string) => ipcRenderer.invoke('categorization-rule:getById', id),
    getByCategory: (categoryId: string) => ipcRenderer.invoke('categorization-rule:getByCategory', categoryId),
    create: (data: any) => ipcRenderer.invoke('categorization-rule:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('categorization-rule:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('categorization-rule:delete', id),
    apply: (transaction: any) => ipcRenderer.invoke('categorization-rule:apply', transaction)
  },
  
  // API Key management
  apiKeys: {
    // Store an API key securely
    store: (type: string, key: string) => ipcRenderer.invoke('api-key:store', type, key),
    
    // Get an API key
    get: (type: string) => ipcRenderer.invoke('api-key:get', type),
    
    // Delete an API key
    delete: (type: string) => ipcRenderer.invoke('api-key:delete', type),
    
    // Check if an API key exists
    exists: (type: string) => ipcRenderer.invoke('api-key:exists', type)
  },
  
  // Database management
  clearDatabase: () => ipcRenderer.invoke('clear-database'),
  
  // Gemini API methods
  gemini: {
    // Initialize the Gemini client
    initialize: () => loggedInvoke('gemini:initialize'),
    
    // Check if the Gemini client is initialized
    isInitialized: () => loggedInvoke('gemini:is-initialized'),
    
    // Suggest a category for a transaction
    suggestCategory: (
      description: string, 
      amount: number, 
      details?: string, 
      existingCategories?: string[]
    ) => loggedInvoke('gemini:suggest-category', description, amount, details, existingCategories),
    
    // Analyze transactions for insights
    analyzeTransactions: (data: any) => loggedInvoke('gemini:analyze-transactions', data)
  },
  
  // Wizard methods
  wizard: {
    // Get uncategorized transactions
    getUncategorizedTransactions: () => loggedInvoke('get-uncategorized-transactions'),
    
    // Get uncategorized transactions count
    getUncategorizedCount: () => loggedInvoke('get-uncategorized-count'),
    
    // Save transaction category
    saveTransactionCategory: (transactionId: string, categoryId: string | null) => 
      loggedInvoke('wizard:saveTransactionCategory', transactionId, categoryId),
      
    // Skip transaction
    skipTransaction: (transactionId: string) =>
      loggedInvoke('wizard:skipTransaction', transactionId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('database', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.database = api
}