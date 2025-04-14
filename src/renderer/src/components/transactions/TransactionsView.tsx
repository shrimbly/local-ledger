import { useEffect, ReactNode } from 'react'
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
import { Transaction } from '../../lib/types'
import { 
  useTransactionStore, 
  useCategoryStore, 
  useFilterStore, 
  useUiStore 
} from '../../stores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Label } from '../ui/label'

export function TransactionsView() {
  // Transaction store state & actions
  const {
    transactions,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalPages,
    selectedTransactions,
    fetchTransactions,
    removeTransaction,
    selectTransactions,
    setCurrentPage,
    setPageSize,
    getFilteredPageTransactions,
    updateTotalPagesFromFiltered
  } = useTransactionStore()

  // Category store state & actions
  const { 
    categories, 
    fetchCategories,
    selectedCategoryId,
    selectCategory,
    getCategoriesForSelection
  } = useCategoryStore()

  // UI store state & actions
  const {
    dialog,
    editingTransaction,
    isBatchAssigning,
    openDialog,
    closeDialog,
    setEditingTransaction,
    setBatchAssigning
  } = useUiStore()

  // Initialize data on component mount
  useEffect(() => {
    fetchTransactions()
    fetchCategories()
  }, [fetchTransactions, fetchCategories])
  
  // Update total pages when transactions or filter changes
  useEffect(() => {
    if (transactions.length > 0) {
      updateTotalPagesFromFiltered()
    }
  }, [transactions, updateTotalPagesFromFiltered])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
  }

  // Add new transaction
  const handleAddClick = () => {
    setEditingTransaction(null)
    openDialog('add')
  }

  // Edit transaction
  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    openDialog('edit')
  }

  // Delete transaction
  const handleDeleteClick = (transaction: Transaction) => {
    openDialog('delete', transaction)
  }

  const handleDelete = async () => {
    if (!dialog.data) return
    
    // Extract transaction ID from dialog data
    const transactionId = (dialog.data as Transaction).id
    await removeTransaction(transactionId)
    closeDialog()
  }

  // Save transaction (create or update)
  const handleTransactionChange = () => {
    closeDialog()
  }

  // Handle selection change
  const handleSelectionChange = (selectedIds: string[]) => {
    selectTransactions(selectedIds)
  }

  // Open batch category assignment modal
  const handleBatchAssign = () => {
    setBatchAssigning(true)
    selectCategory(null)
    openDialog('batch-category')
  }

  // Apply the selected category to all selected transactions
  const handleApplyCategory = async () => {
    if (!selectedCategoryId && selectedCategoryId !== 'no-category') return

    // Get the transaction store's update function
    const { updateTransaction } = useTransactionStore.getState()
    
    try {
      // Update each selected transaction
      const updatePromises = selectedTransactions.map(id => {
        return updateTransaction(id, {
          categoryId: selectedCategoryId === 'no-category' ? null : selectedCategoryId
        })
      })

      await Promise.all(updatePromises)
      
      // Close dialog and reset selections
      closeDialog()
      selectTransactions([])
    } catch (err) {
      console.error('Error updating transactions:', err)
    }
  }

  // Render pagination
  const renderPagination = () => {
    const pageButtons: ReactNode[] = []
    
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
            onClick={() => selectTransactions([])}
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

  const displayedTransactions = getFilteredPageTransactions()
  const categoryOptions = getCategoriesForSelection()

  const renderDialogs = () => {
    return (
      <>
        {/* Transaction Add/Edit Dialog */}
        <Dialog 
          open={dialog.isOpen && ['add', 'edit'].includes(dialog.type || '')} 
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialog.type === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
              </DialogTitle>
            </DialogHeader>
            <TransactionForm 
              transaction={editingTransaction}
              onSave={handleTransactionChange}
              onCancel={closeDialog}
            />
          </DialogContent>
        </Dialog>

        {/* Batch Category Assignment Dialog */}
        <Dialog 
          open={dialog.isOpen && dialog.type === 'batch-category'} 
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batch Assign Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Select Category</Label>
                <Select 
                  value={selectedCategoryId || 'no-category'} 
                  onValueChange={selectCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">
                      <span className="text-gray-500">-- No Category --</span>
                    </SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center">
                          {option.color && (
                            <span 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: option.color }}
                            />
                          )}
                          {option.label}
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
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApplyCategory}
                disabled={!selectedCategoryId && selectedCategoryId !== 'no-category' || isLoading}
              >
                {isLoading ? 'Updating...' : 'Apply Category'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={dialog.isOpen && dialog.type === 'delete'} 
          onOpenChange={(open) => !open && closeDialog()}
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
      </>
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
        transactions={displayedTransactions} 
        isLoading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        selectedTransactions={selectedTransactions}
        onSelectionChange={handleSelectionChange}
        enableSelection={true}
      />

      {renderPagination()}
      {renderDialogs()}
    </div>
  )
}

export default TransactionsView 