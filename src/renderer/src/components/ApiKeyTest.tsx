import { useState, useEffect } from 'react';
import { apiKeyService, ApiKeyType } from '../services/apiKeyService';

export function ApiKeyTest() {
  const [apiKey, setApiKey] = useState<string>('');
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  // Check if API key exists on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        setIsLoading(true);
        const exists = await apiKeyService.hasApiKey(ApiKeyType.GOOGLE_GEMINI);
        setHasKey(exists);
        
        if (exists) {
          const key = await apiKeyService.getApiKey(ApiKeyType.GOOGLE_GEMINI);
          setStoredApiKey(key);
          if (key) {
            // Mask the API key for display
            setMessage(`API key exists: ${maskApiKey(key)}`);
          }
        } else {
          setMessage('No API key stored');
        }
      } catch (error) {
        console.error('Error checking API key:', error);
        setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkApiKey();
  }, []);

  // Function to mask API key for display (show only first and last 4 chars)
  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '********';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Store API key
  const handleStoreApiKey = async () => {
    try {
      setIsLoading(true);
      setMessage('Storing API key...');
      
      const result = await apiKeyService.storeApiKey(ApiKeyType.GOOGLE_GEMINI, apiKey);
      
      if (result) {
        setMessage(`API key stored successfully: ${maskApiKey(apiKey)}`);
        setHasKey(true);
        setStoredApiKey(apiKey);
      } else {
        setMessage('Failed to store API key');
      }
    } catch (error) {
      console.error('Error storing API key:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete API key
  const handleDeleteApiKey = async () => {
    try {
      setIsLoading(true);
      setMessage('Deleting API key...');
      
      const result = await apiKeyService.deleteApiKey(ApiKeyType.GOOGLE_GEMINI);
      
      if (result) {
        setMessage('API key deleted successfully');
        setHasKey(false);
        setStoredApiKey(null);
        setApiKey('');
      } else {
        setMessage('Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h2 className="text-lg font-semibold mb-4">API Key Management Test</h2>
      
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Google Gemini API Key
            </label>
            <input 
              type="text"
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder="Enter your API key"
              className="w-full p-2 border rounded-md mb-2"
            />
            
            <div className="flex space-x-2">
              <button
                onClick={handleStoreApiKey}
                disabled={!apiKey || isLoading}
                className="px-3 py-1 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
              >
                Store API Key
              </button>
              
              {hasKey && (
                <button
                  onClick={handleDeleteApiKey}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-500 text-white rounded-md disabled:bg-gray-300"
                >
                  Delete API Key
                </button>
              )}
            </div>
          </div>
          
          {message && (
            <div className="mt-4 p-2 bg-gray-100 border rounded-md">
              {message}
            </div>
          )}
        </>
      )}
    </div>
  );
} 