import { useState } from 'react'
import FileSelector from './FileSelector'
import ColumnMapper, { ColumnMapping } from './ColumnMapper'
import { parseCSVFile, mapCSVToTransactions, TransactionData } from '../../services/csvParser'
import { Button } from '../ui/button'

function CSVImport() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [isSuccess, setIsSuccess] = useState(false)

  const handleFileSelected = async (selectedFile: File) => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)
    
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
    
    try {
      console.log('Attempting to save transactions:', transactions)
      // Send the entire array of transactions at once
      const results = await window.database.transactions.create(transactions)
      setIsSuccess(true)
      console.log('Saved transactions response:', results)
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
                  <span className="font-medium">Successfully imported {transactions.length} transactions!</span>
                </div>
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
                          {new Date(transaction.date).toLocaleDateString()}
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