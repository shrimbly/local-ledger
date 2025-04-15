import { useState, useEffect } from 'react'
import { geminiService } from '../../services/geminiService'
import { getAllCategories } from '../../services/categoryService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'

export function GeminiTest() {
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [details, setDetails] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [suggestion, setSuggestion] = useState<string | null>(null)

  // Check if the Gemini API is initialized on component mount
  useEffect(() => {
    checkGeminiInitialization()
    loadCategories()
  }, [])

  // Check if the Gemini API is initialized
  const checkGeminiInitialization = async () => {
    try {
      const initialized = await geminiService.isInitialized()
      setIsInitialized(initialized)
      
      if (!initialized) {
        setMessage('Gemini API not initialized. Please add your API key in the Settings.')
      }
    } catch (error) {
      console.error('Error checking Gemini initialization:', error)
      setMessage(`Error checking Gemini initialization: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Load categories for suggestions
  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories()
      setCategories(allCategories.map(c => c.name))
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Initialize the Gemini API
  const handleInitialize = async () => {
    try {
      setIsLoading(true)
      setMessage('Initializing Gemini API...')
      
      const success = await geminiService.initialize()
      
      if (success) {
        setIsInitialized(true)
        setMessage('Gemini API initialized successfully')
      } else {
        setMessage('Failed to initialize Gemini API. Check your API key in the Settings.')
      }
    } catch (error) {
      console.error('Error initializing Gemini API:', error)
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Get a category suggestion
  const handleGetCategorySuggestion = async () => {
    if (!description || !amount) {
      setMessage('Please enter a description and amount')
      return
    }
    
    try {
      setIsLoading(true)
      setSuggestion(null)
      setMessage('Getting category suggestion...')
      
      const result = await geminiService.suggestCategory(
        description,
        parseFloat(amount),
        details || undefined,
        categories
      )
      
      if (result) {
        setSuggestion(result)
        setMessage('Category suggestion received')
      } else {
        setMessage('No category suggestion received')
      }
    } catch (error) {
      console.error('Error getting category suggestion:', error)
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Gemini API Test</CardTitle>
        <CardDescription>Test Google Gemini API functionality</CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {!isInitialized && (
          <div className="mb-4">
            <Button
              onClick={handleInitialize}
              disabled={isLoading}
            >
              Initialize Gemini API
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Transaction Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Starbucks Coffee"
              disabled={isLoading || !isInitialized}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 5.99"
              disabled={isLoading || !isInitialized}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any additional details about the transaction"
              disabled={isLoading || !isInitialized}
              rows={3}
            />
          </div>

          {suggestion && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="font-medium">Suggested Category:</p>
              <p className="text-xl font-bold">{suggestion}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGetCategorySuggestion}
          disabled={isLoading || !isInitialized || !description || !amount}
        >
          {isLoading ? 'Getting Suggestion...' : 'Get Category Suggestion'}
        </Button>
      </CardFooter>
    </Card>
  )
} 