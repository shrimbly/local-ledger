import { useState, useEffect } from 'react'
import { 
  getAllCategorizationRules, 
  deleteCategorizationRule,
  createCategorizationRule, 
  updateCategorizationRule,
  applyCategoryRules
} from '../../services/categorizationRuleService'
import { CategorizationRule, CategorizationRuleCreateInput, CategorizationRuleUpdateInput } from '../../lib/types'
import { useCategoryStore } from '../../stores'
import { useTransactionStore } from '../../stores'
import { getAllTransactions, updateTransaction } from '../../services/transactionService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Plus, Edit, Trash2, Check, X, ZapIcon, RefreshCw } from 'lucide-react'

export function RulesView() {
  // State
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isApplyRulesDialogOpen, setIsApplyRulesDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<{count: number, total: number} | null>(null)
  
  // Form state
  const [pattern, setPattern] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(0)
  const [isEnabled, setIsEnabled] = useState(true)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  
  // Get categories from store
  const { categories, fetchCategories, getCategoryById } = useCategoryStore()
  
  // Fetch rules and categories on component mount
  useEffect(() => {
    fetchRules()
    fetchCategories()
  }, [fetchCategories])
  
  // Fetch all rules
  const fetchRules = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getAllCategorizationRules()
      setRules(data)
    } catch (err) {
      console.error('Error fetching rules:', err)
      setError('Failed to fetch categorization rules. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Reset form state
  const resetForm = () => {
    setPattern('')
    setIsRegex(false)
    setDescription('')
    setPriority(0)
    setIsEnabled(true)
    setCategoryId(undefined)
  }
  
  // Open add dialog
  const handleAddClick = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }
  
  // Open edit dialog
  const handleEditClick = (rule: CategorizationRule) => {
    setEditingRule(rule)
    setPattern(rule.pattern)
    setIsRegex(rule.isRegex)
    setDescription(rule.description || '')
    setPriority(rule.priority)
    setIsEnabled(rule.isEnabled)
    setCategoryId(rule.categoryId)
    setIsEditDialogOpen(true)
  }
  
  // Open delete dialog
  const handleDeleteClick = (ruleId: string) => {
    setDeleteRuleId(ruleId)
    setIsDeleteDialogOpen(true)
  }
  
  // Submit add form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pattern || !categoryId) {
      setError('Pattern and Category are required')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data: CategorizationRuleCreateInput = {
        pattern,
        isRegex,
        description: description || undefined,
        priority,
        isEnabled,
        categoryId
      }
      
      await createCategorizationRule(data)
      setIsAddDialogOpen(false)
      fetchRules()
    } catch (err) {
      console.error('Error creating rule:', err)
      setError('Failed to create rule. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingRule || !pattern || !categoryId) {
      setError('Pattern and Category are required')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const data: CategorizationRuleUpdateInput = {
        pattern,
        isRegex,
        description: description || null,
        priority,
        isEnabled,
        categoryId
      }
      
      await updateCategorizationRule(editingRule.id, data)
      setIsEditDialogOpen(false)
      fetchRules()
    } catch (err) {
      console.error('Error updating rule:', err)
      setError('Failed to update rule. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Delete rule
  const handleDelete = async () => {
    if (!deleteRuleId) return
    
    setIsLoading(true)
    
    try {
      await deleteCategorizationRule(deleteRuleId)
      setIsDeleteDialogOpen(false)
      fetchRules()
    } catch (err) {
      console.error('Error deleting rule:', err)
      setError('Failed to delete rule. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Apply rules to all uncategorized transactions
  const handleApplyRulesToAllTransactions = async () => {
    setIsLoading(true)
    setError(null)
    setApplySuccess(null)
    
    try {
      // Get all transactions
      const transactions = await getAllTransactions()
      
      // Filter uncategorized transactions
      const uncategorizedTransactions = transactions.filter(
        transaction => transaction.categoryId === null || transaction.categoryId === undefined
      )
      
      if (uncategorizedTransactions.length === 0) {
        setApplySuccess({ count: 0, total: 0 })
        setIsApplyRulesDialogOpen(false)
        return
      }
      
      // Apply rules to each transaction
      let categorizedCount = 0
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 20
      for (let i = 0; i < uncategorizedTransactions.length; i += batchSize) {
        const batch = uncategorizedTransactions.slice(i, i + batchSize)
        
        const results = await Promise.all(
          batch.map(async (transaction) => {
            // Try to find a matching rule
            const matchedCategoryId = await applyCategoryRules(transaction)
            
            if (matchedCategoryId) {
              // Update the transaction with the matched category
              await updateTransaction(transaction.id, {
                categoryId: matchedCategoryId
              })
              return true
            }
            return false
          })
        )
        
        // Count categorized transactions
        categorizedCount += results.filter(Boolean).length
      }
      
      // Set success message
      setApplySuccess({
        count: categorizedCount,
        total: uncategorizedTransactions.length
      })
      
      // Close dialog
      setIsApplyRulesDialogOpen(false)
    } catch (err) {
      console.error('Error applying rules to all transactions:', err)
      setError('Failed to apply rules to transactions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Pattern examples
  const patternExamples = [
    { type: 'simple', example: 'AMAZON' },
    { type: 'simple', example: 'Walmart' },
    { type: 'regex', example: '^UBER\\s+' }
  ]
  
  // Render form
  const renderForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => Promise<void>) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pattern">Pattern*</Label>
        <Input
          id="pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Enter text or regex pattern to match"
          required
        />
        <div className="text-sm text-gray-500">
          <p>Examples: {patternExamples.map((p, i) => 
            p.type === 'simple' || !isRegex 
              ? <span key={i} className="font-mono">{p.example}</span> 
              : null
          ).filter(Boolean).reduce((acc, curr, i, arr) => {
            if (i === 0) return [curr]
            return [...acc, ', ', curr]
          }, [] as React.ReactNode[])}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isRegex"
          checked={isRegex}
          onCheckedChange={(checked) => setIsRegex(checked === true)}
        />
        <Label htmlFor="isRegex" className="cursor-pointer">
          Use Regular Expression
        </Label>
      </div>
      
      {isRegex && (
        <div className="text-sm bg-blue-50 p-3 rounded-md text-blue-800">
          <p className="font-semibold">Regex Examples:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            {patternExamples.filter(p => p.type === 'regex').map((p, i) => (
              <li key={i}>
                <code className="bg-blue-100 px-1 rounded">{p.example}</code>: 
                Matches text starting with "UBER" followed by whitespace
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description to explain what this rule does"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          value={priority}
          onChange={(e) => setPriority(parseInt(e.target.value))}
          placeholder="Higher priority rules are checked first"
        />
        <p className="text-sm text-gray-500">Higher priority rules (10+) are checked first</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category*</Label>
        <Select 
          value={categoryId}
          onValueChange={setCategoryId}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
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
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isEnabled"
          checked={isEnabled}
          onCheckedChange={(checked) => setIsEnabled(checked === true)}
        />
        <Label htmlFor="isEnabled" className="cursor-pointer">
          Rule is Enabled
        </Label>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 mt-2">
          {error}
        </div>
      )}
      
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline"
          onClick={() => isEdit ? setIsEditDialogOpen(false) : setIsAddDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
        </Button>
      </DialogFooter>
    </form>
  )
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Categorization Rules</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsApplyRulesDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <ZapIcon className="h-4 w-4" />
            Apply Rules
          </Button>
          <Button onClick={handleAddClick} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3">
          {error}
        </div>
      )}
      
      {applySuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 rounded p-3 flex items-center">
          <Check className="h-5 w-5 mr-2" />
          <span>
            Applied rules to {applySuccess.count} out of {applySuccess.total} uncategorized transactions.
            {applySuccess.count === 0 && " No matching rules found for any transactions."}
          </span>
        </div>
      )}
      
      {isLoading && rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No categorization rules found</p>
          <Button onClick={handleAddClick} variant="outline" className="mt-4">
            Create your first rule
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => {
                const category = getCategoryById(rule.categoryId)
                
                return (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {rule.pattern.length > 30 
                          ? `${rule.pattern.substring(0, 30)}...` 
                          : rule.pattern
                        }
                      </div>
                      {rule.description && (
                        <div className="text-xs text-gray-500">
                          {rule.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isRegex 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.isRegex ? 'Regex' : 'Text'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category ? (
                        <div className="flex items-center">
                          {category.color && (
                            <span 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          <span className="text-sm">{category.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isEnabled ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(rule)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(rule.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add Rule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Create Categorization Rule</DialogTitle>
          </DialogHeader>
          {renderForm(false, handleAddSubmit)}
        </DialogContent>
      </Dialog>
      
      {/* Edit Rule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Edit Categorization Rule</DialogTitle>
          </DialogHeader>
          {renderForm(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this categorization rule? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Apply Rules Confirmation Dialog */}
      <AlertDialog open={isApplyRulesDialogOpen} onOpenChange={setIsApplyRulesDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Rules to All Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply categorization rules to all uncategorized transactions in your database.
              Transactions that already have categories will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyRulesToAllTransactions} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Apply Rules</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default RulesView 