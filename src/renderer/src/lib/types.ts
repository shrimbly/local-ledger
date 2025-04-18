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

export type SpendingType = 'essential' | 'discretionary' | 'mixed' | 'unclassified';

export interface Category {
  id: string
  name: string
  color?: string | null
  spendingType?: SpendingType
  description?: string | null
  transactions?: Transaction[]
  rules?: CategorizationRule[]
  createdAt: Date
  updatedAt: Date
}

export interface CategorizationRule {
  id: string
  pattern: string
  isRegex: boolean
  description?: string | null
  priority: number
  isEnabled: boolean
  categoryId: string
  category?: Category | null
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
  spendingType?: SpendingType
  description?: string
}

export interface CategoryUpdateInput {
  name?: string
  color?: string | null
  spendingType?: SpendingType
  description?: string | null
}

export interface BulkCategoryCreateInput {
  categories: CategoryCreateInput[];
}

export interface CategorizationRuleCreateInput {
  pattern: string
  isRegex?: boolean
  description?: string
  priority?: number
  isEnabled?: boolean
  categoryId: string
}

export interface CategorizationRuleUpdateInput {
  pattern?: string
  isRegex?: boolean
  description?: string | null
  priority?: number
  isEnabled?: boolean
  categoryId?: string
}

export interface CategorySuggestion {
  category: string
  confidence: number
  explanation?: string
}

// Gemini API response types
export interface GeminiError {
  code: string
  message: string
  details?: any
}

export interface GeminiResponse<T> {
  success: boolean
  data?: T
  error?: GeminiError
}

export interface GeminiCategorySuggestion {
  category: string
  confidence: number
  reasoning: string
}