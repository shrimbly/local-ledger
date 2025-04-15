import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { formatCurrency, cn } from '../../lib/utils'
import { TransactionCategorizeAI } from './TransactionCategorizeAI'
import { getAllCategories, createCategory } from '../../services/categoryService'
import { useCategoryStore, useTransactionStore } from '../../stores'
import { Tag, CalendarIcon, DollarSign, InfoIcon, SaveIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateTransaction } from '../../services/transactionService'
import { Category, TransactionUpdateInput } from '../../lib/types'
import { format } from 'date-fns'
import { createRuleSuggestionFromTransaction, createCategorizationRule } from '../../services/categorizationRuleService'
import { formatDate } from '@renderer/lib/format'

interface CategoryInfo {
  id: string
  name: string
  color?: string
}

interface TransactionDetailViewProps {
  transaction: {
    id: string
    date: string
    description: string
    amount: number
    details?: string
    categoryId?: string
    isUnexpected?: boolean
    category?: {
      id: string
      name: string
      color?: string
    }
  }
  onCategoryChange?: () => void
}

export function TransactionDetailView({ 
  transaction,
  onCategoryChange
}: TransactionDetailViewProps) {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [createRule, setCreateRule] = useState(false)
  
  // Editable fields
  const [date, setDate] = useState<Date>(new Date(transaction.date))
  const [description, setDescription] = useState<string>(transaction.description)
  const [details, setDetails] = useState<string>(transaction.details || '')
  const [amount, setAmount] = useState<string>(transaction.amount.toString())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(transaction.categoryId || '')
  const [isUnexpected, setIsUnexpected] = useState<boolean>(transaction.isUnexpected || false)
  
  // Get functions from transaction store
  const { updateTransaction: storeUpdateTransaction, addTransaction: storeAddTransaction } = useTransactionStore()

  // Add state for new category creation
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false)
  const [newCategoryName, setNewCategoryName] = useState<string>('')

  // Initialize data from props
  useEffect(() => {
    setDate(new Date(transaction.date))
    setDescription(transaction.description)
    setDetails(transaction.details || '')
    setAmount(transaction.amount.toString())
    setSelectedCategoryId(transaction.categoryId || '')
    // Reset error when transaction changes
    setError(null)
  }, [transaction])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Load categories
  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories()
      // Map to CategoryInfo to ensure type safety
      setCategories(allCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || undefined
      })))
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setError(null)
      setLoading(true)

      // Validation
      if (description.trim() === '') {
        setError('Description is required')
        setLoading(false)
        return
      }

      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount)) {
        setError('Amount must be a valid number')
        setLoading(false)
        return
      }

      // Convert "no-category" to null for categoryId
      const finalCategoryId = selectedCategoryId === "no-category" ? null : selectedCategoryId || null

      // Create or update data
      const transactionData = {
        date,
        description,
        details: details || null,
        amount: parsedAmount,
        isUnexpected,
        categoryId: finalCategoryId
      }
      
      // Check if this is a new transaction or an existing one
      if (transaction.id === 'new') {
        // Create new transaction
        await storeAddTransaction({
          date,
          description,
          details: details || undefined,
          amount: parsedAmount,
          isUnexpected,
          categoryId: finalCategoryId === null ? undefined : finalCategoryId
        })
        toast.success('Transaction created successfully')
      } else {
        // Update existing transaction
        await storeUpdateTransaction(transaction.id, transactionData)
        
        // Create categorization rule if checkbox is checked and a category is selected
        if (createRule && finalCategoryId) {
          try {
            const updatedTransaction = {
              ...transaction,
              ...transactionData,
              categoryId: finalCategoryId
            }
            const ruleSuggestion = createRuleSuggestionFromTransaction(
              updatedTransaction as any, 
              finalCategoryId
            )
            
            if (ruleSuggestion) {
              await createCategorizationRule(ruleSuggestion)
              toast.success('Created categorization rule')
            }
          } catch (ruleError) {
            console.error('Error creating categorization rule:', ruleError)
            // Don't block the transaction update if rule creation fails
          }
        }
        
        toast.success('Transaction updated successfully')
      }
      
      if (onCategoryChange) onCategoryChange()
    } catch (error) {
      console.error('Error saving transaction:', error)
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error saving transaction'}`)
      toast.error('Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  // Handle category change (for AI categorization)
  const handleApplyCategory = async (categoryId: string) => {
    try {
      setLoading(true)
      setSelectedCategoryId(categoryId)
      
      await updateTransaction(transaction.id, {
        categoryId: categoryId === 'none' ? null : categoryId
      })
      
      toast.success('Category updated successfully')
      if (onCategoryChange) onCategoryChange()
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Failed to update category')
    } finally {
      setLoading(false)
    }
  }

  // Handle AI categorization - create and apply new category
  const handleCreateAndApplyCategory = async (name: string) => {
    try {
      setLoading(true)
      
      // Create new category
      const newCategory = await createCategory({
        name,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random color
      })
      
      if (newCategory) {
        // Apply the new category
        await updateTransaction(transaction.id, {
          categoryId: newCategory.id
        })
        
        // Update local state
        setSelectedCategoryId(newCategory.id)
        
        // Add the new category to our local categories array
        const newCategoryInfo: CategoryInfo = {
          id: newCategory.id,
          name: newCategory.name,
          color: newCategory.color || undefined
        }
        setCategories(prev => [...prev, newCategoryInfo])
        
        toast.success(`Created and applied category "${name}"`)
        if (onCategoryChange) onCategoryChange()
        
        return newCategory.id
      }
      
      return null
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Add function to handle creating a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required')
      return
    }
    
    try {
      setLoading(true)
      
      // Create new category with random color
      const newCategory = await createCategory({
        name: newCategoryName,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random color
      })
      
      if (newCategory) {
        // Add to categories list
        setCategories(prev => [...prev, {
          id: newCategory.id,
          name: newCategory.name,
          color: newCategory.color || undefined
        }])
        
        // Select the new category
        setSelectedCategoryId(newCategory.id)
        
        // Reset state
        setNewCategoryName('')
        setIsAddingCategory(false)
        
        toast.success(`Created category "${newCategoryName}"`)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setError(`Error: ${error instanceof Error ? error.message : 'Failed to create category'}`)
      toast.error('Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-md">Transaction Details</CardTitle>
            <Button 
              onClick={handleSaveChanges} 
              disabled={loading}
              size="sm"
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Date field */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatDate(date) : <span>Select a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        setDate(newDate || new Date())
                        setCalendarOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Amount field */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={loading}
                  className={parseFloat(amount) < 0 ? 'text-red-600' : 'text-green-600'}
                />
                <p className="text-xs text-gray-500">
                  Use positive values for income, negative for expenses
                </p>
              </div>
              
              {/* Description field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  disabled={loading}
                />
              </div>
              
              {/* Details field */}
              <div className="space-y-2">
                <Label htmlFor="details" className="text-sm font-medium">Details (Optional)</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Additional details"
                  disabled={loading}
                  rows={3}
                />
              </div>
              
              {/* Category field */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      id="newCategory"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      disabled={loading}
                      className="flex-1"
                      autoFocus
                    />
                    <Button 
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={loading || !newCategoryName.trim()}
                    >
                      Add
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingCategory(false)
                        setNewCategoryName('')
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedCategoryId || 'no-category'}
                    onValueChange={(value) => {
                      if (value === 'add-new') {
                        setIsAddingCategory(true)
                      } else {
                        setSelectedCategoryId(value === 'no-category' ? '' : value)
                      }
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-[450px] overflow-y-auto"
                      position="popper"
                      side="bottom"
                      sideOffset={5}
                      align="start"
                      avoidCollisions
                    >
                      <SelectItem value="no-category">Uncategorized</SelectItem>
                      <SelectItem value="add-new" className="text-blue-600 font-medium">
                        + Add New Category
                      </SelectItem>
                      <SelectItem value="divider" disabled className="px-2 py-1 m-1 border-t border-gray-200" />
                      {categories.map(category => (
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
                )}
              </div>
              
              {/* Categorization rule checkbox */}
              {selectedCategoryId && selectedCategoryId !== "no-category" && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createRule"
                    checked={createRule}
                    onChange={(e) => setCreateRule(e.target.checked)}
                    disabled={loading}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="createRule" className="cursor-pointer text-sm">
                    Always assign this category to similar transactions
                  </Label>
                </div>
              )}
              
              {/* Unexpected transaction checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isUnexpected"
                  checked={isUnexpected}
                  onChange={(e) => setIsUnexpected(e.target.checked)}
                  disabled={loading}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isUnexpected" className="cursor-pointer text-sm">
                  Mark as unexpected transaction
                </Label>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="text-sm text-red-600 mt-2">
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <TransactionCategorizeAI
          transaction={transaction}
          onApplyCategory={handleApplyCategory}
          onCreateAndApplyCategory={handleCreateAndApplyCategory}
          existingCategories={categories}
        />
      </div>
    </div>
  )
} 