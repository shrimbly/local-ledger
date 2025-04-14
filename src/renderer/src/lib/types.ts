// Type definitions for database models in renderer

export interface Transaction {
  id: string
  date: Date
  description: string
  details?: string | null
  amount: number
  isUnexpected: boolean
  sourceFile?: string | null
  categoryId?: string | null
  category?: Category | null
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  color?: string | null
  transactions?: Transaction[]
  createdAt: Date
  updatedAt: Date
}

// Input types for creating/updating records
export interface TransactionCreateInput {
  date: Date
  description: string
  details?: string
  amount: number
  isUnexpected?: boolean
  sourceFile?: string
  categoryId?: string
}

export type TransactionCreateInputArray = TransactionCreateInput | TransactionCreateInput[];

export interface TransactionUpdateInput {
  date?: Date
  description?: string
  details?: string | null
  amount?: number
  isUnexpected?: boolean
  sourceFile?: string
  categoryId?: string | null
}

export interface CategoryCreateInput {
  name: string
  color?: string
}

export interface CategoryUpdateInput {
  name?: string
  color?: string | null
} 