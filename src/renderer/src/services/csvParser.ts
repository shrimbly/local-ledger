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
 * Parse a date string using a specific format
 */
function parseDate(dateValue: string, format: 'UK' | 'US'): Date {
  // Split the date string by common separators
  const dateParts = dateValue.split(/[\/.-]/)
  
  if (dateParts.length !== 3) {
    throw new Error(`Invalid date format: ${dateValue}`)
  }

  let day: number, month: number, year: number

  if (format === 'UK') {
    // DD/MM/YYYY
    day = parseInt(dateParts[0], 10)
    month = parseInt(dateParts[1], 10) - 1 // JavaScript months are 0-based
    year = parseInt(dateParts[2], 10)
  } else {
    // MM/DD/YYYY
    month = parseInt(dateParts[0], 10) - 1
    day = parseInt(dateParts[1], 10)
    year = parseInt(dateParts[2], 10)
  }

  // Validate the parts
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date components: ${dateValue}`)
  }

  // Create and validate the date
  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateValue}`)
  }

  // Verify the date components match what we set
  // This catches invalid dates like 31/02/2024
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    throw new Error(`Invalid date: ${dateValue}`)
  }

  return date
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
    dateFormat: 'UK' | 'US'
  },
  fileName: string
): TransactionData[] {
  return data.map(row => {
    // Extract values based on mappings
    const dateValue = row[mappings.dateColumn]
    const descriptionValue = row[mappings.descriptionColumn]
    const detailsValue = mappings.detailsColumn ? row[mappings.detailsColumn] : null
    const amountValue = row[mappings.amountColumn]

    // Parse date using specified format
    let date: Date
    try {
      date = parseDate(String(dateValue), mappings.dateFormat)
    } catch (e) {
      console.error(`Failed to parse date: ${dateValue}`, e)
      date = new Date() // Fallback to current date
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
    // Only filter out transactions missing date or amount (the essential fields)
    transaction.date instanceof Date && 
    !isNaN(transaction.date.getTime()) &&
    !isNaN(transaction.amount)
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
        // Match on date and amount only
        existingTrans.date.toDateString() === newTrans.date.toDateString() &&
        existingTrans.amount === newTrans.amount
      )
      
      return isDuplicate ? index : -1
    })
    .filter(index => index !== -1)
} 