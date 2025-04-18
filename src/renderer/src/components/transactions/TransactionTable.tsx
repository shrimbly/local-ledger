import React, { useState } from 'react'
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
import { Edit, Trash2, Check } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'
import { Transaction } from '../../lib/types'
import { useFilterStore, useCategoryStore } from '../../stores'
import { TransactionFilters } from '../../stores/filterStore'
import { Label } from '../ui/label'
import { Form, FormField, FormItem, FormControl } from '../ui/form'
import { formatDate } from '../../lib/format'
import { Combobox } from '../ui/combobox'
import { updateTransaction } from '../../services/transactionService'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { SimpleCategorySelector } from './SimpleCategorySelector'

interface TransactionTableProps {
  transactions: Transaction[]
  isLoading: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  selectedTransactions?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  enableSelection?: boolean
  onRowClick?: (transaction: Transaction) => void
}

function TransactionTable({ 
  transactions, 
  isLoading, 
  onEdit, 
  onDelete,
  selectedTransactions = [],
  onSelectionChange,
  enableSelection = false,
  onRowClick
}: TransactionTableProps) {
  // Track which transaction's category popover is open
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  
  // Get filter store state and actions
  const { 
    filters,
    setSortBy,
    setSortDirection
  } = useFilterStore()
  
  // Get category store selectors and data
  const { getCategoryColor, categories } = useCategoryStore()

  // Format categories for combobox
  const categoryOptions = categories.map(category => ({
    value: category.id,
    label: category.name
  }))
  
  // Handle category change
  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    console.log("Updating category for transaction", transactionId, "to", categoryId);
    try {
      await updateTransaction(transactionId, { categoryId });
      // Close the popover
      setOpenCategoryId(null);
      // Refresh the transactions list
      window.location.reload();
    } catch (error) {
      console.error('Error updating transaction category:', error);
    }
  }

  // Handle column header click for sorting
  const handleSort = (column: TransactionFilters['sortBy']) => {
    if (filters.sortBy === column) {
      setSortDirection(filters.sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  // Generate sort indicator
  const getSortIndicator = (column: string) => {
    if (filters.sortBy !== column) return null
    return filters.sortDirection === 'asc' ? ' ↑' : ' ↓'
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

  // Handle row click
  const handleRowClick = (e: React.MouseEvent, transaction: Transaction) => {
    // Don't trigger row click if clicking on a button, checkbox, or combobox
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('button') || 
       e.target.closest('[role="combobox"]') ||
       e.target.closest('[data-slot="command"]') ||
       e.target.closest('[data-slot="popover"]')
      )
    ) {
      return;
    }
    
    if (onRowClick) onRowClick(transaction)
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
              <TableHead className="w-12 p-0">
                <div className="flex items-center justify-center w-8 h-8 mx-auto">
                  <Checkbox 
                    id="select-all"
                    checked={transactions.length > 0 && selectedTransactions.length === transactions.length}
                    onCheckedChange={handleSelectAllRows}
                    aria-label="Select all"
                    className="cursor-pointer"
                  />
                </div>
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
            <TableHead>Details</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('category')}
            >
              Category{getSortIndicator('category')}
            </TableHead>
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
          {transactions.map((transaction) => (
            <TableRow 
              key={transaction.id} 
              className={`hover:bg-gray-50 ${transaction.isUnexpected ? 'bg-red-50' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={(e) => handleRowClick(e, transaction)}
            >
              {enableSelection && (
                <TableCell className="p-0">
                  <div className="flex items-center justify-center w-8 h-8 mx-auto">
                    <Checkbox 
                      id={`select-${transaction.id}`}
                      checked={selectedTransactions.includes(transaction.id)}
                      onCheckedChange={() => handleRowSelection(transaction.id)}
                      aria-label={`Select transaction ${transaction.description}`}
                      className="cursor-pointer"
                    />
                  </div>
                </TableCell>
              )}
              <TableCell className="font-medium">
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.details || '-'}</TableCell>
              <TableCell onClick={(e) => {
                e.stopPropagation(); 
                console.log("TableCell clicked");
              }}>
                {transaction.categoryId ? (
                  <div className="flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: getCategoryColor(transaction.categoryId) }}
                    />
                    {transaction.category?.name || 'Unknown'}
                  </div>
                ) : (
                  <div onClick={(e) => e.stopPropagation()}>
                    <SimpleCategorySelector transactionId={transaction.id} />
                  </div>
                )}
              </TableCell>
              <TableCell className={`text-right ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(transaction.amount).toFixed(2)}
                <span className="text-xs ml-1">
                  {transaction.amount < 0 ? 'expense' : 'income'}
                </span>
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