import { useState, useEffect, useRef } from 'react'
import { useTransactionStore, useCategoryStore } from '@renderer/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { geminiService } from '@renderer/services/geminiService'
import { AlertCircle, BarChart3, RefreshCw, Send, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { filterTransactionsByDate, aggregateDataForAi, aggregateTransactionData, formatAggregatedDataSummary } from '@renderer/lib/dataAggregation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Textarea } from '@renderer/components/ui/textarea'
import { Input } from '@renderer/components/ui/input'

interface AiAnalysisViewProps {
  timeFilter: 'all' | 'month' | 'year' | 'week'
}

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
}

export function AiAnalysisView({ timeFilter }: AiAnalysisViewProps) {
  const { transactions, isLoading } = useTransactionStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<'initialized' | 'not-configured' | 'checking'>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        setLoading(false)
        return
      }
      
      // Use the new aggregation function
      const summaryData = aggregateDataForAi(filteredTransactions, categories, timeFilter)
      
      if (!summaryData) {
        setError('Could not generate data summary for AI analysis')
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
            setMessages([]);
        } else {
            // Add the AI's message to our chat history
            setMessages([
              {
                role: 'assistant',
                content: result,
                timestamp: new Date()
              }
            ]);
            setError(null);
        }
        
      } catch (aiError) {
        console.warn('AI analysis failed, using local summary:', aiError)
        
        // Use local summary as fallback
        const fullSummary = "# Local Transaction Summary\n\n" +
          "AI analysis is unavailable. Here's a summary of your transactions:\n\n" +
          localSummary
        
        setMessages([
          {
            role: 'assistant',
            content: fullSummary,
            timestamp: new Date()
          }
        ]);
        // Don't set error since we have a fallback, but maybe add a warning insight?
      }
    } catch (err) {
      console.error('Error getting insights:', err)
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
      setMessages([]);
    } finally {
      setLoading(false)
      // Focus the input field after loading is complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }

  // Send user question to AI
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!userInput.trim()) return;
    
    const userMessage = {
      role: 'user' as const,
      content: userInput,
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setUserInput('');
    setLoading(true);
    
    try {
      // Get categories and transaction data for context
      const categories = useCategoryStore.getState().categories;
      const filteredTransactions = filterTransactionsByDate(transactions, timeFilter);
      const summaryData = aggregateDataForAi(filteredTransactions, categories, timeFilter);
      
      if (!summaryData) {
        throw new Error('Could not generate data summary for AI analysis');
      }
      
      // Previous conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // We need to extend the geminiService to have a chat function
      // For now, we'll simulate it
      const result = await geminiService.analyzeTransactions({
        ...summaryData,
        userQuery: userInput,
        conversationHistory
      } as any);
      
      if (!result) {
        throw new Error('AI response timed out or failed');
      }
      
      if (result.startsWith('Error:')) {
        setError(result);
      } else {
        // Add AI response to chat
        setMessages(prevMessages => [
          ...prevMessages, 
          {
            role: 'assistant',
            content: result,
            timestamp: new Date()
          }
        ]);
        setError(null);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
      
      // Add error message to chat
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle user pressing Enter (without Shift)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format and display chat messages
  const renderChatMessages = () => {
    if (loading && messages.length === 0) {
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

    if (error && messages.length === 0) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (messages.length === 0) {
      return (
        <p className="text-muted-foreground mt-4">
          Click the "Generate Insights" button to get AI-powered analysis of your spending.
        </p>
      )
    }

    return (
      <div className="space-y-4 mb-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-3 shadow-sm ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 rounded-bl-none'
              }`}
            >
              {message.role === 'user' ? (
                <p>{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-p:leading-relaxed prose-li:my-0.5">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc space-y-1 pl-4 mb-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal space-y-1 pl-4 mb-4" {...props} />,
                      li: ({node, ...props}) => <li className="ml-4" {...props} />,
                      code: ({node, className, ...props}: any) => 
                        props.inline ? 
                          <code className="bg-primary/10 dark:bg-primary/20 rounded px-1 py-0.5 text-xs" {...props} /> : 
                          <code className="block bg-black/5 dark:bg-white/5 rounded p-2 text-xs" {...props} />
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
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
          className="bg-primary/90 hover:bg-primary"
        >
          {loading && messages.length === 0 ? (
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
      <CardContent className="max-w-4xl mx-auto">
        {renderApiConfigMessage()}
        <div className="max-h-[70vh] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent bg-gray-50 dark:bg-gray-900/30 rounded-md p-4">
          {renderChatMessages()}
        </div>
        {messages.length > 0 && (
          <form onSubmit={handleSendMessage} className="relative mt-4">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask a follow-up question..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || apiStatus !== 'initialized'}
              className="pr-12 border-primary/20 focus-visible:ring-primary/70 focus-visible:ring-offset-0 focus:rounded-md bg-muted/40 rounded-md py-6 px-4 h-12 outline-none focus-visible:outline-none"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={loading || !userInput.trim() || apiStatus !== 'initialized'} 
              className="absolute right-1.5 top-1/2 transform -translate-y-1/2 rounded-full h-9 w-9 flex items-center justify-center"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default AiAnalysisView 