import { useState, useEffect, ReactElement } from 'react'
import { Button } from '../ui/button'
import { Plus, Pencil, Trash2, Tag, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import TransactionTable from './TransactionTable'
import { TransactionForm } from './TransactionForm'
import { Transaction, Category } from '../../lib/types'
import { getAllTransactions, deleteTransaction, updateTransaction } from '../../services/transactionService'
import { getAllCategories } from '../../services/categoryService'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Label } from '../ui/label'

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [isBatchAssigning, setIsBatchAssigning] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllCategories()
        setCategories(data)
      } catch (err) {
        console.error('Error fetching categories:', err)
      }
    }
    
    fetchCategories()
  }, [])

  // Calculate total pages when transactions change
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(transactions.length / pageSize)))
    // If current page is higher than total pages, adjust it
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [transactions.length, pageSize])

  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getAllTransactions()
      console.log('Fetched transactions:', data)
      setTransactions(data)
    } catch (err) {
      setError('Failed to fetch transactions. Please try again.')
      console.error('Error fetching transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page
  }

  // Get transactions for current page
  const getCurrentPageTransactions = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return transactions.slice(startIndex, endIndex)
  }

  // Add new transaction
  const handleAddClick = () => {
    setEditingTransaction(null)
    setDialogOpen(true)
  }

  // Edit transaction
  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setDialogOpen(true)
  }

  // Delete transaction
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction)
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return

    try {
      await deleteTransaction(transactionToDelete.id)
      fetchTransactions() // Refresh the list
      setTransactionToDelete(null)
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Failed to delete transaction. Please try again.')
    }
  }

  // Save transaction (create or update)
  const handleTransactionChange = () => {
    fetchTransactions()
    setDialogOpen(false)
  }

  // Handle selection change
  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedTransactions(selectedIds)
  }

  // Open batch category assignment modal
  const handleBatchAssign = () => {
    setIsBatchAssigning(true)
    setSelectedCategoryId('')
  }

  // Apply the selected category to all selected transactions
  const handleApplyCategory = async () => {
    if (!selectedCategoryId) return

    setIsBatchUpdating(true)
    setError(null)

    try {
      // Update each selected transaction
      const updatePromises = selectedTransactions.map(id => {
        const transaction = transactions.find(t => t.id === id)
        if (!transaction) return Promise.resolve()

        return updateTransaction(id, {
          categoryId: selectedCategoryId === 'none' ? null : selectedCategoryId
        })
      })

      await Promise.all(updatePromises)
      fetchTransactions() // Refresh the list
      
      // Close dialog and reset selections
      setIsBatchAssigning(false)
      setSelectedTransactions([])
    } catch (err) {
      console.error('Error updating transactions:', err)
      setError('Failed to update categories. Please try again.')
    } finally {
      setIsBatchUpdating(false)
    }
  }

  // Render pagination
  const renderPagination = () => {
    const pageButtons: ReactElement[] = []
    
    // Previous button
    pageButtons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Prev
      </Button>
    )
    
    // Page numbers
    const maxButtons = 5
    const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    const endPage = Math.min(totalPages, startPage + maxButtons - 1)
    
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      )
    }
    
    // Next button
    pageButtons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    )

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, transactions.length)} of {transactions.length}
        </div>
        <div className="flex space-x-1">
          {pageButtons}
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-500">Page size:</span>
          <select 
            value={pageSize} 
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            className="p-1 text-sm border rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    )
  }

  // Batch action toolbar
  const renderBatchActionToolbar = () => {
    if (selectedTransactions.length === 0) return null
    
    return (
      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md mt-4 mb-2">
        <div className="text-sm font-medium">
          {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSelectedTransactions([])}
          >
            Clear Selection
          </Button>
          <Button 
            size="sm"
            onClick={handleBatchAssign}
          >
            <Tag className="h-4 w-4 mr-2" />
            Assign Category
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Transactions</h2>
        <div className="flex space-x-2">
          <Button onClick={fetchTransactions} disabled={isLoading} variant="outline">
            Refresh
          </Button>
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded">
          {error}
        </div>
      )}

      {renderBatchActionToolbar()}

      <TransactionTable 
        transactions={getCurrentPageTransactions()} 
        isLoading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        selectedTransactions={selectedTransactions}
        onSelectionChange={handleSelectionChange}
        enableSelection={true}
      />

      {renderPagination()}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm 
            transaction={editingTransaction}
            onSave={handleTransactionChange}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchAssigning} onOpenChange={setIsBatchAssigning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Assign Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Select Category</Label>
              <Select 
                value={selectedCategoryId} 
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-gray-500">-- No Category --</span>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center">
                        {category.color && (
                          <span 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              This will assign the selected category to {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''}.
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsBatchAssigning(false)}
              disabled={isBatchUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApplyCategory}
              disabled={!selectedCategoryId || isBatchUpdating}
            >
              {isBatchUpdating ? 'Updating...' : 'Apply Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={!!transactionToDelete} 
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TransactionsView 