import { useState, useEffect } from 'react'
import { useTransactionStore, useCategoryStore } from '@renderer/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { geminiService } from '@renderer/services/geminiService'
import { AlertCircle, BarChart3, RefreshCw, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { filterTransactionsByDate, aggregateDataForAi, aggregateTransactionData, formatAggregatedDataSummary } from '@renderer/lib/dataAggregation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AiAnalysisViewProps {
  timeFilter: 'all' | 'month' | 'year' | 'week'
}

export function AiAnalysisView({ timeFilter }: AiAnalysisViewProps) {
  const { transactions, isLoading } = useTransactionStore()
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<'initialized' | 'not-configured' | 'checking'>('checking')

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      setApiStatus('checking')
      try {
        // Check for internet connectivity first
        const isOnline = navigator.onLine
        if (!isOnline) {
          setApiStatus('not-configured')
          setError('You are currently offline. AI features require internet connectivity.')
          return
        }
        
        // Try to initialize if not already initialized
        let isInitialized = await geminiService.isInitialized()
        
        // If not initialized, explicitly try to initialize
        if (!isInitialized) {
          console.log('Gemini API not initialized, attempting to initialize...')
          await geminiService.initialize()
          
          // Check again after initialization attempt
          isInitialized = await geminiService.isInitialized()
        }
        
        setApiStatus(isInitialized ? 'initialized' : 'not-configured')
      } catch (err) {
        console.error('Error checking API status:', err)
        setApiStatus('not-configured')
      }
    }

    checkApiStatus()
    
    // Add event listeners for online/offline status
    const handleOnline = () => {
      setError(null)
      checkApiStatus()
    }
    
    const handleOffline = () => {
      setApiStatus('not-configured')
      setError('You are currently offline. AI features require internet connectivity.')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get insights from AI
  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Check connectivity
      if (!navigator.onLine) {
        setError('You are currently offline. AI features require internet connectivity.')
        setLoading(false)
        return
      }
      
      // Get categories
      const categories = useCategoryStore.getState().categories
      
      // Filter transactions based on time filter
      const filteredTransactions = filterTransactionsByDate(transactions, timeFilter)
      
      if (filteredTransactions.length === 0) {
        setError('No transactions available for analysis')
        setInsights(null)
        setLoading(false)
        return
      }
      
      // Use the new aggregation function
      const summaryData = aggregateDataForAi(filteredTransactions, categories, timeFilter)
      
      if (!summaryData) {
        setError('Could not generate data summary for AI analysis')
        setInsights(null)
        setLoading(false)
        return
      }
      
      // Generate local summary as fallback
      const aggregatedDataForFallback = aggregateTransactionData(filteredTransactions, categories)
      const localSummary = formatAggregatedDataSummary(aggregatedDataForFallback)
      
      // Try to get AI insights using the new summary data
      try {
        // Force recheck of API status
        if (apiStatus !== 'initialized') {
          const isInitialized = await geminiService.isInitialized()
          if (!isInitialized) {
            await geminiService.initialize()
            // If still not initialized after trying, use the fallback
            if (!(await geminiService.isInitialized())) {
              throw new Error('Unable to initialize Gemini API')
            }
          }
          // Update status if now initialized
          setApiStatus('initialized')
        }
        
        // Get insights from Gemini API, passing the structured summary
        const result = await Promise.race([
          // Cast summaryData to any to bypass strict type checking for IPC call temporarily
          geminiService.analyzeTransactions(summaryData as any), 
          // Timeout after 30 seconds (increased timeout)
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 45000))
        ])
        
        if (!result) {
          throw new Error('AI analysis timed out or failed')
        }
        
        // Check if the result is an error message from the main process
        if (result.startsWith('Error:')) {
            setError(result);
            setInsights(null);
        } else {
            setInsights(result);
            setError(null);
        }
        
      } catch (aiError) {
        console.warn('AI analysis failed, using local summary:', aiError)
        
        // Use local summary as fallback
        const fullSummary = "# Local Transaction Summary\n\n" +
          "AI analysis is unavailable. Here's a summary of your transactions:\n\n" +
          localSummary
        
        setInsights(fullSummary)
        // Don't set error since we have a fallback, but maybe add a warning insight?
      }
    } catch (err) {
      console.error('Error getting insights:', err)
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
      setInsights(null)
    } finally {
      setLoading(false)
    }
  }

  // Format and display insights
  const renderInsights = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!insights) {
      return (
        <p className="text-muted-foreground mt-4">
          Click the "Generate Insights" button to get AI-powered analysis of your spending.
        </p>
      )
    }

    // Render the insights with markdown formatting
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert mt-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}) => <p className="mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
            // Add explicit styling for lists and list items (removed 'ordered' from props)
            ul: ({node, ...props}) => <ul className="list-disc space-y-1 pl-4 mb-4" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal space-y-1 pl-4 mb-4" {...props} />,
            li: ({node, ...props}) => <li className="ml-4" {...props} />
          }}
        >
          {insights}
        </ReactMarkdown>
      </div>
    )
  }

  // Render the API configuration message
  const renderApiConfigMessage = () => {
    if (apiStatus === 'checking') {
      return (
        <Alert className="mt-4">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking Gemini API status...</AlertTitle>
          <AlertDescription>
            Please wait while we connect to the Gemini API. This should only take a moment.
          </AlertDescription>
        </Alert>
      )
    }

    if (apiStatus === 'not-configured') {
      return (
        <Alert variant="default" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gemini API Not Configured</AlertTitle>
          <AlertDescription>
            To use AI-powered insights, you need to configure your Gemini API key in Settings.
            If you've already added an API key, please check that it is valid.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  // Determine the period text based on timeFilter
  const periodText = (() => {
    switch (timeFilter) {
      case 'month':
        return 'Last 30 Days'
      case 'year':
        return 'Last 12 Months'
      default:
        return 'All Time'
    }
  })()

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            AI Spending Insights
          </CardTitle>
          <CardDescription>
            {`AI-powered analysis of your transactions (${periodText})`}
          </CardDescription>
        </div>
        <Button 
          onClick={fetchInsights} 
          disabled={loading || apiStatus !== 'initialized' || isLoading}
          size="sm"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {renderApiConfigMessage()}
        {renderInsights()}
      </CardContent>
    </Card>
  )
}

export default AiAnalysisView 