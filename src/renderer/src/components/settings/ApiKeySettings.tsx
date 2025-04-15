import { useState, useEffect } from 'react'
import { apiKeyService, ApiKeyType } from '../../services/apiKeyService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Badge } from '../ui/badge'
import { ExclamationTriangleIcon, CheckCircledIcon, Cross2Icon } from '@radix-ui/react-icons'
import { Label } from '../ui/label'

export function ApiKeySettings() {
  const [apiKey, setApiKey] = useState<string>('')
  const [hasKey, setHasKey] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: null,
    text: ''
  })

  // Check if API key exists on component mount
  useEffect(() => {
    checkApiKey()
  }, [])

  const checkApiKey = async () => {
    try {
      setIsLoading(true)
      const exists = await apiKeyService.hasApiKey(ApiKeyType.GOOGLE_GEMINI)
      setHasKey(exists)
      
      if (exists) {
        setMessage({
          type: 'success',
          text: 'Google Gemini API key is configured and ready to use.'
        })
      } else {
        setMessage({
          type: 'info',
          text: 'No API key stored. Enter your key to enable AI features.'
        })
      }
    } catch (error) {
      console.error('Error checking API key:', error)
      setMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error checking API key'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to mask API key for display (show only first and last 4 chars)
  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '********'
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  // Store API key
  const handleStoreApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid API key'
      })
      return
    }
    
    try {
      setIsLoading(true)
      setMessage({
        type: 'info',
        text: 'Storing API key...'
      })
      
      const result = await apiKeyService.storeApiKey(ApiKeyType.GOOGLE_GEMINI, apiKey)
      
      if (result) {
        setMessage({
          type: 'success',
          text: hasKey ? 'API key updated successfully' : 'API key stored successfully'
        })
        setHasKey(true)
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to store API key'
        })
      }
    } catch (error) {
      console.error('Error storing API key:', error)
      setMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error storing API key'}`
      })
    } finally {
      setApiKey('')
      setIsLoading(false)
    }
  }

  // Delete API key
  const handleDeleteApiKey = async () => {
    try {
      setIsLoading(true)
      setMessage({
        type: 'info',
        text: 'Deleting API key...'
      })
      
      const result = await apiKeyService.deleteApiKey(ApiKeyType.GOOGLE_GEMINI)
      
      if (result) {
        setMessage({
          type: 'info',
          text: 'API key deleted successfully'
        })
        setHasKey(false)
        setApiKey('')
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to delete API key'
        })
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      setMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error deleting API key'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>API Key Management</CardTitle>
            <CardDescription>Configure API keys for AI-powered features</CardDescription>
          </div>
          {hasKey && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <CheckCircledIcon className="h-3 w-3" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {message.type && (
          <Alert 
            className={`mb-4 ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : message.type === 'success' 
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'error' && <ExclamationTriangleIcon className="h-4 w-4" />}
              {message.type === 'success' && <CheckCircledIcon className="h-4 w-4" />}
              <AlertTitle>
                {message.type === 'error' ? 'Error' : 
                 message.type === 'success' ? 'Success' : 'Info'}
              </AlertTitle>
            </div>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium mb-2">Google Gemini API</h3>
            <p className="text-sm text-gray-500 mb-4">
              The Google Gemini API is used for AI-powered transaction categorization and insights.
              You can get an API key from the{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="gemini-api-key">API Key</Label>
                <Input
                  id="gemini-api-key"
                  type="password"
                  placeholder={hasKey ? "Enter new API key to update" : "Enter Google Gemini API key"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {hasKey ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStoreApiKey}
              disabled={!apiKey.trim() || isLoading}
              className="flex items-center gap-1"
            >
              Update API Key
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteApiKey}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <Cross2Icon className="h-4 w-4" />
              Remove API Key
            </Button>
          </>
        ) : (
          <Button
            onClick={handleStoreApiKey}
            disabled={!apiKey.trim() || isLoading}
            size="sm"
          >
            Save API Key
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 