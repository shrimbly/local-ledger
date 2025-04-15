import { useState, useEffect, useRef } from 'react'
import CSVImport from './components/csv-import/CSVImport'
import TransactionsView from './components/transactions/TransactionsView'
import { CategoriesView } from './components/categories/CategoriesView'
import RulesView from './components/rules/RulesView'
import AnalyticsView from './components/analytics/AnalyticsView'
import { ApiKeyTest } from './components/ApiKeyTest'
import { GeminiTest } from './components/gemini/GeminiTest'
import { SettingsView } from './components/settings/SettingsView'
import { Button } from './components/ui/button'
import { useUiStore } from './stores'

const DEBUG = true;

function App(): JSX.Element {
  console.log('App component rendering')
  
  // Keep track of mount status
  const isMounted = useRef(true);
  useEffect(() => {
    console.log('App component mounted');
    
    // Make sure all event handlers are working
    window.addEventListener('click', () => {
      if (DEBUG) console.log('Window click event fired');
    });
    
    return () => {
      isMounted.current = false;
      console.log('App component unmounted');
    };
  }, []);
  
  // Test the UI store directly
  const isDarkMode = useUiStore(state => state.isDarkMode)
  const toggleDarkMode = useUiStore(state => state.toggleDarkMode)
  
  // Fix: Use state with explicit setter for activeView
  const [activeView, setActiveView] = useState<'transactions' | 'import' | 'categories' | 'rules' | 'test' | 'analytics' | 'settings'>('transactions')
  
  // Count re-renders
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`App has rendered ${renderCount.current} times`);
  });
  
  // Add debug console logs to track view changes
  useEffect(() => {
    console.log('Active view changed to:', activeView)
  }, [activeView])
  
  // Debug: Create button refs to check if they're capturing events
  const testBtnRef = useRef<HTMLButtonElement>(null);
  const transactionsBtnRef = useRef<HTMLButtonElement>(null);
  const categoriesBtnRef = useRef<HTMLButtonElement>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const rulesBtnRef = useRef<HTMLButtonElement>(null);
  
  // Track button click attempts
  const [clickHistory, setClickHistory] = useState<string[]>([]);
  
  // Debug: Explicitly define view handlers with event logging
  const switchToTest = (e: React.MouseEvent) => {
    console.log('Test button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Test (${new Date().toLocaleTimeString()})`]);
    setActiveView('test');
  }
  
  const switchToTransactions = (e: React.MouseEvent) => {
    console.log('Transactions button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Transactions (${new Date().toLocaleTimeString()})`]);
    setActiveView('transactions');
  }
  
  const switchToCategories = (e: React.MouseEvent) => {
    console.log('Categories button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Categories (${new Date().toLocaleTimeString()})`]);
    setActiveView('categories');
  }
  
  const switchToImport = (e: React.MouseEvent) => {
    console.log('Import button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Import (${new Date().toLocaleTimeString()})`]);
    setActiveView('import');
  }
  
  const switchToRules = (e: React.MouseEvent) => {
    console.log('Rules button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Rules (${new Date().toLocaleTimeString()})`]);
    setActiveView('rules');
  }
  
  const switchToAnalytics = (e: React.MouseEvent) => {
    console.log('Analytics button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Analytics (${new Date().toLocaleTimeString()})`]);
    setActiveView('analytics');
  }
  
  // Add settings view handler
  const switchToSettings = (e: React.MouseEvent) => {
    console.log('Settings button clicked', e);
    console.dir(e.currentTarget);
    setClickHistory(prev => [...prev, `Settings (${new Date().toLocaleTimeString()})`]);
    setActiveView('settings');
  }
  
  // Simple test component
  const SimpleTest = () => {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Testing Application</h2>
        <p className="mb-4">If you can see this, the basic React rendering is working.</p>
        <div>
          <p>Dark mode: {isDarkMode ? 'On' : 'Off'}</p>
          <Button 
            onClick={toggleDarkMode}
            className="mt-2"
          >
            Toggle Dark Mode
          </Button>
        </div>
        <div className="mt-4">
          <p>Current view: <strong>{activeView}</strong></p>
          <p>Render count: <strong>{renderCount.current}</strong></p>
        </div>
        
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">API Key Testing</h3>
          <ApiKeyTest />
        </div>
        
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Gemini API Testing</h3>
          <GeminiTest />
        </div>
        
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold">Click History:</h3>
          {clickHistory.length === 0 ? (
            <p className="text-gray-500">No tabs clicked yet</p>
          ) : (
            <ul className="list-disc pl-5">
              {clickHistory.map((click, i) => (
                <li key={i}>{click}</li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="mt-4">
          <Button 
            onClick={() => {
              console.log('Clear history clicked');
              setClickHistory([]);
            }}
            variant="outline"
            className="mt-2"
          >
            Clear Click History
          </Button>
          <Button 
            onClick={() => {
              console.log('Force update clicked');
              forceUpdate();
            }}
            className="mt-2 ml-2"
          >
            Force Update
          </Button>
        </div>
      </div>
    )
  }
  
  // Helper to force update
  const [, updateState] = useState<object>();
  const forceUpdate = () => updateState({});

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Local Ledger</h1>
          <p className="mt-2 opacity-75">Import and manage your transactions</p>
          
          <div className="mt-6 flex gap-2">
            <Button 
              ref={testBtnRef}
              variant={activeView === 'test' ? 'default' : 'outline'}
              onClick={switchToTest}
              className="border-2 border-blue-500"
            >
              Test View
            </Button>
            <Button 
              ref={transactionsBtnRef}
              variant={activeView === 'transactions' ? 'default' : 'outline'}
              onClick={switchToTransactions}
              className="border-2 border-green-500"
            >
              Transactions
            </Button>
            <Button 
              ref={categoriesBtnRef}
              variant={activeView === 'categories' ? 'default' : 'outline'}
              onClick={switchToCategories}
              className="border-2 border-yellow-500"
            >
              Categories
            </Button>
            <Button 
              ref={importBtnRef}
              variant={activeView === 'import' ? 'default' : 'outline'}
              onClick={switchToImport}
              className="border-2 border-purple-500"
            >
              Import CSV
            </Button>
            <Button 
              ref={rulesBtnRef}
              variant={activeView === 'rules' ? 'default' : 'outline'}
              onClick={switchToRules}
              className="border-2 border-orange-500"
            >
              Rules
            </Button>
            <Button 
              variant={activeView === 'analytics' ? 'default' : 'outline'}
              onClick={switchToAnalytics}
              className="border-2 border-indigo-500"
            >
              Analytics
            </Button>
            <Button 
              variant={activeView === 'settings' ? 'default' : 'outline'}
              onClick={switchToSettings}
              className="border-2 border-gray-500"
            >
              Settings
            </Button>
          </div>
        </header>
        
        <main>
          {(() => {
            console.log(`Rendering view component for: ${activeView}`);
            if (activeView === 'test') return <SimpleTest />;
            if (activeView === 'import') return <CSVImport />;
            if (activeView === 'transactions') return <TransactionsView />;
            if (activeView === 'categories') return <CategoriesView />;
            if (activeView === 'rules') return <RulesView />;
            if (activeView === 'analytics') return <AnalyticsView />;
            if (activeView === 'settings') return <SettingsView />;
            return <div>Unknown view: {activeView}</div>;
          })()}
        </main>
      </div>
    </div>
  )
}

export default App
