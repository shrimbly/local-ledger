import { useEffect, ReactNode, useState } from 'react'
import { Button } from '../ui/button'
import { Plus, Pencil, Trash2, Tag, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import TransactionTable from './TransactionTable'
import { TransactionForm } from './TransactionForm'
import TransactionFilters from './TransactionFilters'
import { TransactionDetailView } from './TransactionDetailView'
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
import { 
  getAllTransactions, 
  getTransactionById, 
  deleteTransaction 
} from '../../services/transactionService'
import { createCategorizationRule, createRuleSuggestionFromTransaction } from '../../services/categorizationRuleService'

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

  // Add state for the "Create rules" checkbox
  const [createRules, setCreateRules] = useState(false)

  // Add state for selected transaction
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

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
  }, [transactions, updateTotalPagesFromFiltered, useFilterStore(state => state.filters)])

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
    // Create an empty transaction and set it as selected
    const emptyTransaction: Transaction = {
      id: 'new', // Temporary ID
      date: new Date(),
      description: '',
      amount: 0,
      details: '',
      isUnexpected: false,
      categoryId: null,
      category: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceFile: null
    }
    setSelectedTransaction(emptyTransaction)
  }

  // Edit transaction
  const handleEditClick = (transaction: Transaction) => {
    handleTransactionClick(transaction);
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
    if (!selectedCategoryId) return

    // Get the transaction store's update function and get all transactions
    const { updateTransaction } = useTransactionStore.getState()
    
    try {
      // Get the full transaction objects for all selected IDs
      const allTransactions = await getAllTransactions()
      const selectedTransactionObjects = allTransactions.filter(t => 
        selectedTransactions.includes(t.id)
      )
      
      // Update each selected transaction
      const updatePromises = selectedTransactions.map(id => {
        return updateTransaction(id, {
          categoryId: selectedCategoryId === 'no-category' ? null : selectedCategoryId
        })
      })

      await Promise.all(updatePromises)
      
      // Create categorization rules if checkbox is checked
      if (createRules && selectedCategoryId !== 'no-category') {
        // Create a rule for each selected transaction
        const rulePromises = selectedTransactionObjects.map(transaction => {
          const ruleSuggestion = createRuleSuggestionFromTransaction(
            transaction,
            selectedCategoryId
          )
          
          if (ruleSuggestion) {
            return createCategorizationRule(ruleSuggestion)
              .catch(error => {
                console.error(`Error creating rule for transaction ${transaction.id}:`, error)
                return null
              })
          }
          return Promise.resolve(null)
        })
        
        await Promise.all(rulePromises)
        console.log(`Created categorization rules for ${selectedTransactions.length} transactions`)
      }
      
      // Close dialog and reset selections
      closeDialog()
      selectTransactions([])
    } catch (err) {
      console.error('Error updating transactions:', err)
    }
  }

  // Handle transaction click for detail view
  const handleTransactionClick = async (transaction: Transaction) => {
    try {
      // Get the full transaction with all details
      const fullTransaction = await getTransactionById(transaction.id)
      setSelectedTransaction(fullTransaction)
    } catch (error) {
      console.error('Error getting transaction details:', error)
    }
  }

  // Handle closing detail view
  const handleCloseDetail = () => {
    setSelectedTransaction(null)
  }

  // Handle category change callback
  const handleCategoryChange = async () => {
    // Refresh transactions after category or other changes
    await fetchTransactions()
    
    // If we have a selected transaction that was just updated, close the detail view
    if (selectedTransaction && selectedTransaction.id === 'new') {
      // If this was a new transaction, just close the detail view
      setSelectedTransaction(null)
    } else if (selectedTransaction) {
      // For existing transactions, refresh the selected transaction
      try {
        const updatedTransaction = await getTransactionById(selectedTransaction.id)
        if (updatedTransaction) {
          setSelectedTransaction(updatedTransaction)
        } else {
          // Transaction might have been deleted
          setSelectedTransaction(null)
        }
      } catch (error) {
        console.error('Error refreshing transaction details:', error)
        setSelectedTransaction(null)
      }
    }
  }

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null
    
    const pageNumbers: number[] = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {startPage > 1 && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePageChange(1)}
              >
                1
              </Button>
              {startPage > 2 && <span className="mx-1">...</span>}
            </>
          )}
          
          {pageNumbers.map(pageNum => (
            <Button 
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"} 
              size="sm"
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="mx-1">...</span>}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          
          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => handlePageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
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
        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={dialog.isOpen && dialog.type === 'delete'} 
          onOpenChange={(open) => !open && closeDialog()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Category Assignment Dialog */}
        <Dialog 
          open={dialog.isOpen && dialog.type === 'batch-category'} 
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Assign Category to {selectedTransactions.length} Transaction{selectedTransactions.length !== 1 ? 's' : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="category-select">Select Category</Label>
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
              
              {/* Always create rules checkbox - only show when a category is selected */}
              {selectedCategoryId && selectedCategoryId !== 'no-category' && (
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    id="createRules"
                    checked={createRules}
                    onChange={(e) => setCreateRules(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="createRules" className="cursor-pointer">
                    Always assign this category to similar transactions
                  </Label>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  type="submit"
                  disabled={!selectedCategoryId}
                  onClick={handleApplyCategory}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => closeDialog()}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="w-full">
      {!selectedTransaction ? (
        <>
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <Button onClick={handleAddClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
          
          <TransactionFilters className="mb-4" />
          
          {selectedTransactions.length > 0 && renderBatchActionToolbar()}
          
          <TransactionTable 
            transactions={getFilteredPageTransactions()}
            isLoading={isLoading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            selectedTransactions={selectedTransactions}
            onSelectionChange={handleSelectionChange}
            enableSelection={true}
            onRowClick={handleTransactionClick}
          />
          
          {renderPagination()}
        </>
      ) : (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Transaction Details</h1>
            <Button 
              variant="outline" 
              onClick={handleCloseDetail}
            >
              <X className="w-4 h-4 mr-2" />
              Back to Transactions
            </Button>
          </div>
          
          <TransactionDetailView 
            transaction={{
              ...selectedTransaction,
              date: selectedTransaction.date instanceof Date ? selectedTransaction.date.toISOString() : selectedTransaction.date,
              details: selectedTransaction.details || undefined,
              categoryId: selectedTransaction.categoryId || undefined,
              isUnexpected: selectedTransaction.isUnexpected,
              category: selectedTransaction.category ? {
                id: selectedTransaction.category.id,
                name: selectedTransaction.category.name,
                color: selectedTransaction.category.color || undefined
              } : undefined
            }}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      )}
      
      {renderDialogs()}
    </div>
  )
}

export default TransactionsView 