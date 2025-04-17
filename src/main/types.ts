// Type definitions for database models

export type SpendingType = 'essential' | 'discretionary' | 'mixed' | 'unclassified';

export interface Transaction {
  id: string
  date: Date | string
  description: string
  details?: string | null
  amount: number
  isUnexpected: boolean
  sourceFile?: string | null
  categoryId?: string | null
  category?: Category | null
  createdAt: Date | string
  updatedAt: Date | string
  isSkipped?: boolean
  reviewedAt?: Date | null
}

export interface Category {
  id: string
  name: string
  color?: string | null
  spendingType?: SpendingType
  description?: string | null
  transactions?: Transaction[]
  rules?: CategorizationRule[]
  createdAt: Date | string
  updatedAt: Date | string
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
  createdAt: Date | string
  updatedAt: Date | string
}

// Input types for creating/updating records
export interface TransactionCreateInput {
  date: Date
  description: string
  details?: string | null
  amount: number
  isUnexpected?: boolean
  sourceFile?: string | null
  categoryId?: string | null
  isSkipped?: boolean
  reviewedAt?: Date | null
}

export type TransactionCreateInputArray = TransactionCreateInput | TransactionCreateInput[];

export interface TransactionUpdateInput {
  date?: Date
  description?: string
  details?: string | null
  amount?: number
  isUnexpected?: boolean
  sourceFile?: string | null
  categoryId?: string | null
  isSkipped?: boolean
  reviewedAt?: string | null
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

// Gemini API types
export interface GeminiError {
  message: string
  details?: string
  code?: ERROR_CODES
}

export interface GeminiResponse<T> {
  success: boolean
  data: T | null
  error?: GeminiError
}

export interface GeminiCategorySuggestion {
  category: string
  confidence: number
  reasoning: string
}

// Error codes for Gemini API
export enum ERROR_CODES {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  API_ERROR = 'API_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  BATCH_PROCESSING = 'BATCH_PROCESSING'
} 