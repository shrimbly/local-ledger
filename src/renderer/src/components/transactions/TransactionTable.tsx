import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table'
import { Button } from '../ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'
import { Transaction } from '../../lib/types'

interface TransactionTableProps {
  transactions: Transaction[]
  isLoading: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  selectedTransactions?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  enableSelection?: boolean
}

function TransactionTable({ 
  transactions, 
  isLoading, 
  onEdit, 
  onDelete,
  selectedTransactions = [],
  onSelectionChange,
  enableSelection = false
}: TransactionTableProps) {
  // State for sorting
  const [sortColumn, setSortColumn] = useState<keyof Transaction>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Handle column header click for sorting
  const handleSort = (column: keyof Transaction) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort transactions based on current sort state
  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === bValue) return 0
    
    // Handle different data types
    let comparison = 0
    if (sortColumn === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
    } else if (sortColumn === 'amount') {
      comparison = a.amount - b.amount
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Generate sort indicator
  const getSortIndicator = (column: keyof Transaction) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  // Handle row selection
  const handleRowSelection = (transactionId: string) => {
    if (!onSelectionChange) return
    
    const newSelectedIds = selectedTransactions.includes(transactionId)
      ? selectedTransactions.filter(id => id !== transactionId)
      : [...selectedTransactions, transactionId]
    
    onSelectionChange(newSelectedIds)
  }

  // Handle select all rows
  const handleSelectAllRows = () => {
    if (!onSelectionChange) return
    
    if (selectedTransactions.length === transactions.length) {
      // Deselect all
      onSelectionChange([])
    } else {
      // Select all
      onSelectionChange(transactions.map(t => t.id))
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && <TableHead className="w-12"></TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(3).fill(0).map((_, index) => (
              <TableRow key={index}>
                {enableSelection && (
                  <TableCell>
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-4 w-16 ml-auto animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        {transactions.length === 0 && (
          <TableCaption>
            <div className="py-4">
              <p className="text-center">No transactions found.</p>
              <p className="text-center text-sm text-gray-500 mt-1">
                Try adding a new transaction or importing from CSV.
              </p>
            </div>
          </TableCaption>
        )}
        <TableHeader>
          <TableRow>
            {enableSelection && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={transactions.length > 0 && selectedTransactions.length === transactions.length}
                  onCheckedChange={handleSelectAllRows}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('date')}
            >
              Date{getSortIndicator('date')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('description')}
            >
              Description{getSortIndicator('description')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('details')}
            >
              Details{getSortIndicator('details')}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50 text-right"
              onClick={() => handleSort('amount')}
            >
              Amount{getSortIndicator('amount')}
            </TableHead>
            {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-gray-50">
              {enableSelection && (
                <TableCell>
                  <Checkbox 
                    checked={selectedTransactions.includes(transaction.id)}
                    onCheckedChange={() => handleRowSelection(transaction.id)}
                    aria-label={`Select transaction ${transaction.description}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                {new Date(transaction.date).toLocaleDateString()}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.details || '-'}</TableCell>
              <TableCell>
                {transaction.category ? (
                  <div className="flex items-center">
                    {transaction.category.color && (
                      <span 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: transaction.category.color }}
                      />
                    )}
                    {transaction.category.name}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className={`text-right ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {transaction.amount.toFixed(2)}
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell>
                  <div className="flex space-x-2">
                    {onEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDelete(transaction)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default TransactionTable 