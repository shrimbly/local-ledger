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
    update: (id: string, data: any) => ipcRenderer.invoke('update-category', id, data),
    delete: (id: string) => ipcRenderer.invoke('delete-category', id)
  },
  
  // Database management
  clearDatabase: () => ipcRenderer.invoke('clear-database')
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
