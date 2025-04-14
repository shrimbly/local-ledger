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
}

declare global {
  interface Window {
    electron: ElectronAPI
    database: DatabaseAPI
  }
}
