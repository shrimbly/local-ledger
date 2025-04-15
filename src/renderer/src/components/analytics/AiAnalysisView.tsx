import { useState, useEffect } from 'react'
import { useTransactionStore, useCategoryStore } from '@renderer/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { geminiService } from '@renderer/services/geminiService'
import { AlertCircle, BarChart3, RefreshCw, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { filterTransactionsByDate, prepareTransactionsForAiAnalysis, aggregateTransactionData, formatAggregatedDataSummary } from '@renderer/lib/dataAggregation'

interface AiAnalysisViewProps {
  timeFilter: 'all' | 'month' | 'year'
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
        
        const isInitialized = await geminiService.isInitialized()
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
      
      // Generate local summary as fallback
      const aggregatedData = aggregateTransactionData(filteredTransactions, categories)
      const localSummary = formatAggregatedDataSummary(aggregatedData)
      
      // Try to get AI insights
      try {
        // Prepare data for analysis
        const transactionsForAi = prepareTransactionsForAiAnalysis(filteredTransactions, categories)
        
        // Get insights from Gemini API
        const result = await Promise.race([
          geminiService.analyzeTransactions(transactionsForAi),
          // Timeout after 10 seconds
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
        ])
        
        if (!result) {
          throw new Error('AI analysis timed out or failed')
        }
        
        setInsights(result)
        setError(null)
      } catch (aiError) {
        console.warn('AI analysis failed, using local summary:', aiError)
        
        // Use local summary as fallback
        const fullSummary = "# Local Transaction Summary\n\n" +
          "AI analysis is unavailable. Here's a summary of your transactions:\n\n" +
          localSummary
        
        setInsights(fullSummary)
        // Don't set error since we have a fallback
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
      <div className="prose prose-sm max-w-none mt-4">
        {insights.split('\n').map((paragraph, index) => {
          // Check if paragraph is a heading (starts with #)
          if (paragraph.startsWith('# ')) {
            return <h3 key={index} className="text-lg font-bold mt-4">{paragraph.substring(2)}</h3>
          }
          // Check if paragraph is a subheading (starts with ##)
          if (paragraph.startsWith('## ')) {
            return <h4 key={index} className="text-md font-semibold mt-3">{paragraph.substring(3)}</h4>
          }
          // Check if paragraph is a list item (starts with -)
          if (paragraph.startsWith('- ')) {
            return <li key={index} className="ml-4">{paragraph.substring(2)}</li>
          }
          // Check if paragraph is a numbered list item (starts with 1., 2., etc.)
          if (/^\d+\.\s/.test(paragraph)) {
            return <li key={index} className="ml-4">{paragraph.substring(paragraph.indexOf('.')+1)}</li>
          }
          // Empty paragraph - add spacing
          if (paragraph.trim() === '') {
            return <div key={index} className="h-2"></div>
          }
          // Regular paragraph
          return <p key={index}>{paragraph}</p>
        })}
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
          <AlertDescription>Please wait while we check your API configuration.</AlertDescription>
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