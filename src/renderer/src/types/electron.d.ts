interface ElectronAPI {
  // Add any Electron API methods here
}

interface DatabaseAPI {
  // Transaction methods
  transactions: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<void>
  }
  
  // Category methods
  categories: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<void>
  }
  
  // Categorization Rule methods
  categorizationRules: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    getByCategory: (categoryId: string) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<void>
    apply: (transaction: any) => Promise<string | null>
  }
  
  // Database management
  clearDatabase: () => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    database: DatabaseAPI
  }
} 