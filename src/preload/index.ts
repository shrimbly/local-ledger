import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Transaction methods
  transactions: {
    getAll: () => ipcRenderer.invoke('get-transactions'),
    getById: (id: string) => ipcRenderer.invoke('get-transaction', id),
    create: (data: any) => ipcRenderer.invoke('create-transaction', data),
    update: (id: string, data: any) => ipcRenderer.invoke('update-transaction', id, data),
    delete: (id: string) => ipcRenderer.invoke('delete-transaction', id)
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
    initialize: () => ipcRenderer.invoke('gemini:initialize'),
    
    // Check if the Gemini client is initialized
    isInitialized: () => ipcRenderer.invoke('gemini:is-initialized'),
    
    // Suggest a category for a transaction
    suggestCategory: (
      description: string, 
      amount: number, 
      details?: string, 
      existingCategories?: string[]
    ) => ipcRenderer.invoke('gemini:suggest-category', description, amount, details, existingCategories),
    
    // Analyze transactions for insights
    analyzeTransactions: (transactions: any[]) => ipcRenderer.invoke('gemini:analyze-transactions', transactions)
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
