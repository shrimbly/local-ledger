import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { Separator } from '@renderer/components/ui/separator'
import { type Transaction } from '@renderer/lib/types'
import { formatCurrency } from '@renderer/lib/format'
import { useState, useEffect } from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Label } from '@renderer/components/ui/label'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@renderer/components/ui/tooltip'

interface TransactionDetailsProps {
  transaction: Transaction
  categories: string[]
  onCategorySelect: (category: string) => void
  createRule?: boolean
  onCreateRuleChange?: (checked: boolean) => void
}

export function TransactionDetails({ 
  transaction, 
  categories, 
  onCategorySelect,
  createRule = false,
  onCreateRuleChange
}: TransactionDetailsProps) {
  const formattedDate = new Date(transaction.date).toLocaleDateString()
  const formattedAmount = formatCurrency(transaction.amount)
  const isExpense = transaction.amount < 0

  // Extract category name from the Category object if it exists
  const [selectedCategory, setSelectedCategory] = useState<string>(transaction.category?.name || '')
  // Local createRule state only if no external control is provided
  const [localCreateRule, setLocalCreateRule] = useState(false)
  
  // Determine if we're using external or local state for the checkbox
  const isExternallyControlled = onCreateRuleChange !== undefined
  const checkboxChecked = isExternallyControlled ? createRule : localCreateRule
  
  // Update local state when transaction changes
  useEffect(() => {
    setSelectedCategory(transaction.category?.name || '')
    if (!isExternallyControlled) {
      setLocalCreateRule(false) // Reset local checkbox when transaction changes
    }
  }, [transaction.id, transaction.category?.name, isExternallyControlled])

  // Handle category change
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = event.target.value
    setSelectedCategory(newCategory)
    
    // Pass selected category
    onCategorySelect(newCategory)
    
    // Reset dropdown to blank state after selecting
    // We use setTimeout to ensure the selection is processed before resetting
    setTimeout(() => {
      setSelectedCategory('')
    }, 50)
  }

  // Handle rule creation checkbox change
  const handleCreateRuleChange = (checked: boolean) => {
    if (isExternallyControlled && onCreateRuleChange) {
      onCreateRuleChange(checked)
    } else {
      setLocalCreateRule(checked)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Transaction
            </h3>
            <p className="text-sm text-muted-foreground">
              Review and categorize
            </p>
          </div>
          <Badge className={isExpense ? "bg-red-100 text-red-800 hover:bg-red-200" : "bg-green-100 text-green-800 hover:bg-green-200"}>
            {isExpense ? "Expense" : "Income"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {/* Primary Information (Most Important) */}
          <div className="rounded-lg bg-muted/40 p-4 border border-muted">
            <div className="text-lg font-medium mb-3">
              {transaction.description}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">{formattedDate}</div>
              <div className={`text-xl font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                {formattedAmount}
              </div>
            </div>
          </div>
          
          {/* Category Selection with Rule Creation Checkbox */}
          <div className="grid gap-3">
            <div className="font-semibold">Category</div>
            <div className="w-full">
              <select 
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Rule Creation Checkbox */}
            <div className="flex items-center space-x-2 mt-1">
              <Checkbox 
                id="create-rule" 
                checked={checkboxChecked} 
                onCheckedChange={handleCreateRuleChange} 
              />
              <div className="flex items-center">
                <Label htmlFor="create-rule" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Create rule for similar transactions
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground ml-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>A rule will be created to automatically categorize future transactions with similar descriptions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          {/* Additional Details Section */}
          {transaction.details && (
            <div className="grid gap-2">
              <div className="font-semibold">Additional Details</div>
              <div className="text-sm bg-muted/30 p-3 rounded-md border border-muted whitespace-pre-wrap">
                {transaction.details}
              </div>
            </div>
          )}
          
          {/* Secondary Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {transaction.sourceFile && (
              <div>
                <div className="font-medium text-muted-foreground">Source</div>
                <div className="truncate">{transaction.sourceFile}</div>
              </div>
            )}
            {transaction.isUnexpected && (
              <div>
                <div className="font-medium text-muted-foreground">Status</div>
                <Badge variant="outline" className="mt-1 bg-yellow-50 text-yellow-800 border-yellow-300">
                  Unexpected
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}