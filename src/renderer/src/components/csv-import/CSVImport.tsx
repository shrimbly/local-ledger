import { useState } from 'react'
import FileSelector from './FileSelector'
import ColumnMapper, { ColumnMapping } from './ColumnMapper'
import { parseCSVFile, mapCSVToTransactions, TransactionData } from '../../services/csvParser'
import { Button } from '../ui/button'
import { createTransaction, createTransactions } from '../../services/transactionService'
import { Transaction, TransactionCreateInput } from '../../lib/types'
import { formatDate } from '../../lib/format'

function CSVImport() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [isSuccess, setIsSuccess] = useState(false)
  const [appliedRules, setAppliedRules] = useState<{count: number, transactions: string[]}>({count: 0, transactions: []})
  const [duplicatesSkipped, setDuplicatesSkipped] = useState<number>(0)

  const handleFileSelected = async (selectedFile: File) => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)
    setAppliedRules({count: 0, transactions: []})
    setDuplicatesSkipped(0)
    
    try {
      const result = await parseCSVFile(selectedFile)
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      setFile(selectedFile)
      setCsvData(result.data)
      setColumns(result.columns)
      setIsDialogOpen(true)
    } catch (err) {
      setError('Failed to parse CSV file. Please check the format and try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleColumnsMap = (mapping: ColumnMapping) => {
    if (!file) return
    
    const mappedTransactions = mapCSVToTransactions(csvData, mapping, file.name)
    setTransactions(mappedTransactions)
  }

  const handleSaveTransactions = async () => {
    setIsLoading(true)
    setError(null)
    setAppliedRules({count: 0, transactions: []})
    setDuplicatesSkipped(0)
    
    try {
      console.log('Attempting to save transactions:', transactions)
      
      // Process transactions using the transaction service to apply categorization rules
      const savedTransactions: Transaction[] = []
      const rulesApplied: string[] = []
      let skippedCount = 0
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 50
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize)
        
        // Use the transaction service to ensure rules are applied
        const results = await Promise.all(
          batch.map(async (transactionData) => {
            // Convert TransactionData to TransactionCreateInput
            const createInput: TransactionCreateInput = {
              date: transactionData.date,
              description: transactionData.description,
              details: transactionData.details,
              amount: transactionData.amount,
              isUnexpected: transactionData.isUnexpected,
              sourceFile: transactionData.sourceFile,
              categoryId: transactionData.categoryId === null ? undefined : transactionData.categoryId
            }
            
            const savedTransaction = await createTransaction(createInput)
            
            // Check if this was a skipped duplicate
            if (savedTransaction.id === 'skipped-duplicate') {
              skippedCount++;
              return null; // Don't add to savedTransactions
            }
            
            // Check if a rule was applied (categoryId was null initially but is now set)
            if (savedTransaction.categoryId && !transactionData.categoryId) {
              rulesApplied.push(savedTransaction.description)
            }
            
            return savedTransaction
          })
        )
        
        // Filter out null values (skipped duplicates)
        savedTransactions.push(...results.filter(t => t !== null) as Transaction[])
      }
      
      setDuplicatesSkipped(skippedCount)
      setAppliedRules({
        count: rulesApplied.length,
        transactions: rulesApplied
      })
      
      setIsSuccess(true)
      console.log('Saved transactions:', savedTransactions.length)
      console.log('Skipped duplicates:', skippedCount)
    } catch (err) {
      setError('Failed to save transactions. Please try again.')
      console.error('Error saving transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Import Transactions</h2>
        
        <FileSelector onFileSelected={handleFileSelected} />
        
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <span className="font-medium">Note:</span> Only date and amount fields are required. 
            Description and details are optional. 
            Duplicate transactions (with the same date and amount) will be automatically skipped.
          </p>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
            {error}
          </div>
        )}

        <ColumnMapper 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          columns={columns}
          data={csvData}
          onColumnsMap={handleColumnsMap}
        />
      
        {transactions.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800">Transactions Ready to Import</h3>
                <p className="text-sm text-gray-500">
                  {transactions.length} transactions from {file?.name}
                </p>
              </div>
              <Button 
                onClick={handleSaveTransactions}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? 'Saving...' : 'Save Transactions'}
              </Button>
            </div>
            
            {isSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Successfully imported {transactions.length - duplicatesSkipped} transactions!</span>
                </div>
                
                {duplicatesSkipped > 0 && (
                  <div className="mt-2 flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="font-medium">{duplicatesSkipped} {duplicatesSkipped === 1 ? 'transaction was' : 'transactions were'} skipped (already exists)</span>
                    </div>
                  </div>
                )}
                
                {appliedRules.count > 0 && (
                  <div className="mt-2 flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <div>
                      <span className="font-medium">{appliedRules.count} transactions were automatically categorized!</span>
                      {appliedRules.transactions.length > 0 && (
                        <div className="text-sm mt-1 text-green-700">
                          <p>Examples: {appliedRules.transactions.slice(0, 3).map(t => `"${t}"`).join(", ")}
                          {appliedRules.transactions.length > 3 ? ` and ${appliedRules.transactions.length - 3} more...` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.slice(0, 5).map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {transaction.details || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                            {transaction.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length > 5 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-sm text-center text-gray-500 bg-gray-50">
                          + {transactions.length - 5} more transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CSVImport 