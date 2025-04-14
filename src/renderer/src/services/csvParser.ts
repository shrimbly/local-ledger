import Papa from 'papaparse'

interface ParseResult {
  data: Record<string, any>[]
  columns: string[]
  error?: string
}

// Define transaction interface to match our database schema
export interface TransactionData {
  date: Date
  description: string
  details?: string
  amount: number
  isUnexpected: boolean
  sourceFile?: string
  categoryId?: string | null
}

/**
 * Parses a CSV file and returns the data with column headers
 */
export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          // Return the first error
          resolve({
            data: [],
            columns: [],
            error: results.errors[0].message
          })
          return
        }

        // Extract column headers from the first row
        const columns = results.meta.fields || []
        
        resolve({
          data: results.data as Record<string, any>[],
          columns,
        })
      },
      error: (error) => {
        resolve({
          data: [],
          columns: [],
          error: error.message
        })
      }
    })
  })
}

/**
 * Maps CSV data to transaction format based on user-selected column mappings
 */
export function mapCSVToTransactions(
  data: Record<string, any>[],
  mappings: {
    dateColumn: string
    descriptionColumn: string
    detailsColumn?: string
    amountColumn: string
  },
  fileName: string
): TransactionData[] {
  return data.map(row => {
    // Extract values based on mappings
    const dateValue = row[mappings.dateColumn]
    const descriptionValue = row[mappings.descriptionColumn]
    const detailsValue = mappings.detailsColumn ? row[mappings.detailsColumn] : null
    const amountValue = row[mappings.amountColumn]

    // Parse date - accept different formats
    let date: Date
    try {
      // Try to parse as ISO date first
      date = new Date(dateValue)
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try different formats (MM/DD/YYYY, DD/MM/YYYY)
        const dateParts = dateValue.split(/[\/.-]/)
        if (dateParts.length === 3) {
          // Try MM/DD/YYYY
          date = new Date(`${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`)
          
          // If still invalid, try DD/MM/YYYY
          if (isNaN(date.getTime())) {
            date = new Date(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`)
          }
        }
      }
    } catch (e) {
      // Default to current date if parsing fails
      date = new Date()
    }

    // Parse amount - handle different formats
    let amount: number
    if (typeof amountValue === 'number') {
      amount = amountValue
    } else if (typeof amountValue === 'string') {
      // Remove currency symbols and commas
      const cleanedAmount = amountValue.replace(/[^0-9.-]+/g, '')
      amount = parseFloat(cleanedAmount) || 0
    } else {
      amount = 0
    }

    // Create transaction object
    return {
      date,
      description: descriptionValue?.toString() || '',
      details: detailsValue?.toString() || undefined,
      amount,
      isUnexpected: false,
      sourceFile: fileName,
    }
  }).filter(transaction => 
    // Filter out invalid transactions
    transaction.description && !isNaN(transaction.amount)
  )
}

/**
 * Detects potential duplicate transactions in the data
 */
export function detectDuplicates(
  newTransactions: TransactionData[],
  existingTransactions: TransactionData[]
): number[] {
  if (!existingTransactions || existingTransactions.length === 0) {
    return []
  }

  return newTransactions
    .map((newTrans, index) => {
      const isDuplicate = existingTransactions.some(existingTrans => 
        // Match on date, description and amount
        existingTrans.date.toDateString() === newTrans.date.toDateString() &&
        existingTrans.description === newTrans.description &&
        existingTrans.amount === newTrans.amount
      )
      
      return isDuplicate ? index : -1
    })
    .filter(index => index !== -1)
} 