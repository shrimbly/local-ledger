import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Transaction, TransactionCreateInput, TransactionUpdateInput } from '../../lib/types'
import { useTransactionStore, useCategoryStore } from '../../stores'

interface TransactionFormProps {
  transaction: Transaction | null
  onSave: () => void
  onCancel: () => void
}

export function TransactionForm({ transaction, onSave, onCancel }: TransactionFormProps) {
  // Get transaction store actions
  const { 
    addTransaction, 
    updateTransaction, 
    isLoading 
  } = useTransactionStore()

  // Get category store state and actions
  const { 
    categories, 
    fetchCategories, 
    getCategoriesForSelection 
  } = useCategoryStore()

  // Form fields
  const [date, setDate] = useState<Date>(new Date())
  const [description, setDescription] = useState('')
  const [details, setDetails] = useState('')
  const [amount, setAmount] = useState('')
  const [isUnexpected, setIsUnexpected] = useState(false)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  
  // Form state
  const [error, setError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Set initial values when editing an existing transaction
  useEffect(() => {
    if (transaction) {
      setDate(new Date(transaction.date))
      setDescription(transaction.description)
      setDetails(transaction.details || '')
      setAmount(transaction.amount.toString())
      setIsUnexpected(transaction.isUnexpected)
      setCategoryId(transaction.categoryId || undefined)
    } else {
      // Reset form when adding a new transaction
      setDate(new Date())
      setDescription('')
      setDetails('')
      setAmount('')
      setIsUnexpected(false)
      setCategoryId(undefined)
    }
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Validation
      if (description.trim() === '') {
        setError('Description is required')
        return
      }

      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount)) {
        setError('Amount must be a valid number')
        return
      }

      // Convert "no-category" to null for categoryId
      const finalCategoryId = categoryId === "no-category" ? null : categoryId;

      if (transaction) {
        // Update existing transaction
        const updateData: TransactionUpdateInput = {
          date,
          description,
          details: details || null,
          amount: parsedAmount,
          isUnexpected,
          categoryId: finalCategoryId
        }
        await updateTransaction(transaction.id, updateData)
      } else {
        // Create new transaction
        const createData: TransactionCreateInput = {
          date,
          description,
          details: details || undefined,
          amount: parsedAmount,
          isUnexpected,
          categoryId: finalCategoryId === null ? undefined : finalCategoryId
        }
        await addTransaction(createData)
      }

      // Signal to parent that we've updated data
      onSave()
    } catch (err) {
      console.error('Error saving transaction:', err)
      setError('Failed to save transaction. Please try again.')
    }
  }

  const categoryOptions = getCategoriesForSelection()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
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
              {date ? format(date, "PPP") : <span>Pick a date</span>}
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

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter transaction description"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Details (Optional)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Additional details about this transaction"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount (use negative value for expenses)"
          disabled={isLoading}
        />
        <p className="text-sm text-gray-500">
          Use positive numbers for income, negative for expenses
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category (Optional)</Label>
        <Select 
          value={categoryId || "no-category"}
          onValueChange={(value) => setCategoryId(value === "no-category" ? undefined : value)}
          disabled={isLoading}
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

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isUnexpected"
          checked={isUnexpected}
          onChange={(e) => setIsUnexpected(e.target.checked)}
          disabled={isLoading}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="isUnexpected" className="cursor-pointer">
          Mark as unexpected transaction
        </Label>
      </div>

      {error && (
        <div className="text-sm text-red-600 mt-2">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : transaction ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
} 