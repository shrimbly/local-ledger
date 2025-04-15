import { ElectronAPI } from '@electron-toolkit/preload'

interface DatabaseAPI {
  transactions: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any | null>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<any>
  }
  categories: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any | null>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<any>
  }
  clearDatabase: () => Promise<boolean>
  apiKeys: {
    store: (type: string, key: string) => Promise<boolean>
    get: (type: string) => Promise<string | null>
    delete: (type: string) => Promise<boolean>
    exists: (type: string) => Promise<boolean>
  }
  gemini: {
    initialize: () => Promise<boolean>
    isInitialized: () => Promise<boolean>
    suggestCategory: (
      description: string, 
      amount: number, 
      details?: string, 
      existingCategories?: string[]
    ) => Promise<string | null>
    analyzeTransactions: (transactions: any[]) => Promise<string | null>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    database: DatabaseAPI
  }
}
