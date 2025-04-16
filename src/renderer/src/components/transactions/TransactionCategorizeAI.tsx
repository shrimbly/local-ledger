import { useState, useEffect } from 'react'
import { geminiService } from '../../services/geminiService'
import { getAllCategories, createCategory } from '../../services/categoryService'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Loader2Icon, CheckIcon, XIcon, WandIcon, PlusIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { GeminiResponse, GeminiCategorySuggestion } from '@renderer/lib/types'

interface TransactionCategorizeAIProps {
  transaction: {
    id: string
    description: string
    amount: number
    details?: string
    categoryId?: string
  }
  onApplyCategory: (categoryId: string) => Promise<void>
  onCreateAndApplyCategory: (name: string) => Promise<string | null>
  existingCategories: Array<{ id: string; name: string }>
}

export function TransactionCategorizeAI({
  transaction,
  onApplyCategory,
  onCreateAndApplyCategory,
  existingCategories
}: TransactionCategorizeAIProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [matchingCategory, setMatchingCategory] = useState<{ id: string; name: string } | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)

  // Check if API is initialized on mount
  useEffect(() => {
    checkGeminiInitialization()
  }, [])

  // Check if Gemini API is available and initialized
  const checkGeminiInitialization = async () => {
    try {
      // First check if we have an API key
      const initialized = await geminiService.isInitialized()
      setIsInitialized(initialized)
      setHasApiKey(initialized)
      
      if (!initialized) {
        const success = await geminiService.initialize()
        setIsInitialized(success)
      }
    } catch (error) {
      console.error('Error checking Gemini availability:', error)
      setIsInitialized(false)
    }
  }

  // Get category suggestion
  const handleGetSuggestion = async () => {
    if (!transaction) return
    
    try {
      setIsLoading(true)
      setSuggestion(null)
      setMatchingCategory(null)
      
      // Initialize if not initialized
      if (!isInitialized) {
        const success = await geminiService.initialize()
        if (!success) {
          toast.error('Could not initialize Gemini API. Please check API key in Settings.')
          setIsLoading(false)
          return
        }
        setIsInitialized(true)
      }
      
      // Get category names for suggestions
      const categoryNames = existingCategories.map(c => c.name)
      
      const response = await geminiService.suggestCategory(
        transaction.description,
        transaction.amount,
        transaction.details,
        categoryNames
      )
      
      if (response && response.success && response.data && response.data.length > 0) {
        // Use the top suggestion (highest confidence)
        const topSuggestion = response.data[0];
        setSuggestion(topSuggestion.category);
        
        // Check if this matches an existing category
        const match = existingCategories.find(
          c => c.name.toLowerCase() === topSuggestion.category.toLowerCase()
        )
        
        if (match) {
          setMatchingCategory(match)
        }
      } else {
        toast.error('No suggestion received. Try again or categorize manually.')
      }
    } catch (error) {
      console.error('Error getting category suggestion:', error)
      toast.error('Failed to get category suggestion')
    } finally {
      setIsLoading(false)
    }
  }

  // Apply suggested category (if it exists)
  const handleApplySuggestion = async () => {
    if (!matchingCategory) return
    
    try {
      setIsLoading(true)
      await onApplyCategory(matchingCategory.id)
      toast.success(`Categorized as "${matchingCategory.name}"`)
    } catch (error) {
      console.error('Error applying category:', error)
      toast.error('Failed to apply category')
    } finally {
      setIsLoading(false)
    }
  }

  // Create and apply new category
  const handleCreateAndApply = async () => {
    if (!suggestion) return
    
    try {
      setIsLoading(true)
      const newCategoryId = await onCreateAndApplyCategory(suggestion)
      
      if (newCategoryId) {
        toast.success(`Created and applied category "${suggestion}"`)
      } else {
        toast.error('Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasApiKey) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <WandIcon className="h-4 w-4" />
            AI Categorization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 text-sm">
            To use AI-powered categorization, add your Google Gemini API key in Settings.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.hash = '#settings'}
          >
            Go to Settings
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <WandIcon className="h-4 w-4" />
          AI Categorization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestion ? (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium block mb-1">Suggestion:</span>
              <Badge className="text-base">{suggestion}</Badge>
              {matchingCategory && (
                <p className="text-xs text-green-600 mt-1">
                  Matches existing category
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Get AI-powered category suggestions based on transaction details.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        {!suggestion ? (
          <Button 
            onClick={handleGetSuggestion} 
            disabled={isLoading || !transaction}
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <WandIcon className="h-4 w-4 mr-2" />
                Suggest Category
              </>
            )}
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            {matchingCategory ? (
              <Button 
                onClick={handleApplySuggestion} 
                disabled={isLoading}
                size="sm"
                className="flex-1"
                variant="outline"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Apply
              </Button>
            ) : (
              <Button 
                onClick={handleCreateAndApply} 
                disabled={isLoading}
                size="sm"
                className="flex-1"
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create & Apply
              </Button>
            )}
            <Button 
              onClick={() => {
                setSuggestion(null)
                setMatchingCategory(null)
              }} 
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
} 