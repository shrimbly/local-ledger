import './assets/main.css'
import './assets/index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Add error boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <pre style={{ 
            backgroundColor: '#f8f8f8', 
            padding: '10px', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => {
              // Clear localStorage and reload
              localStorage.clear()
              window.location.reload()
            }}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Storage & Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Add console message for debugging
console.log('Starting application...')

// DEBUG: Reset localStorage (remove this in production)
try {
  console.log('Clearing localStorage to reset state...')
  localStorage.clear()
  console.log('localStorage cleared')
} catch (e) {
  console.error('Failed to clear localStorage:', e)
}

try {
  const rootElement = document.getElementById('root')
  console.log('Root element found:', rootElement)
  
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  const root = ReactDOM.createRoot(rootElement)
  console.log('React root created')
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  console.log('React app rendered')
} catch (error) {
  console.error('Failed to mount React application:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1 style="color: red;">Failed to initialize application</h1>
      <pre style="background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; border-radius: 4px; overflow: auto;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
      <button onclick="localStorage.clear(); window.location.reload()" style="margin-top: 20px; padding: 8px 16px; background-color: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer">
        Clear Storage & Reload
      </button>
    </div>
  `
}
