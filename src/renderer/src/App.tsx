import { useState } from 'react'
import CSVImport from './components/csv-import/CSVImport'
import TransactionsView from './components/transactions/TransactionsView'
import { CategoriesView } from './components/categories/CategoriesView'
import { Button } from './components/ui/button'

function App(): JSX.Element {
  const [activeView, setActiveView] = useState<'transactions' | 'import' | 'categories'>('transactions')

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Local Ledger</h1>
          <p className="text-gray-600 mt-2">Import and manage your transactions</p>
          
          <div className="mt-6 flex gap-2">
            <Button 
              variant={activeView === 'transactions' ? 'default' : 'outline'}
              onClick={() => setActiveView('transactions')}
            >
              Transactions
            </Button>
            <Button 
              variant={activeView === 'categories' ? 'default' : 'outline'}
              onClick={() => setActiveView('categories')}
            >
              Categories
            </Button>
            <Button 
              variant={activeView === 'import' ? 'default' : 'outline'}
              onClick={() => setActiveView('import')}
            >
              Import CSV
            </Button>
          </div>
        </header>
        
        <main>
          {activeView === 'import' && <CSVImport />}
          {activeView === 'transactions' && <TransactionsView />}
          {activeView === 'categories' && <CategoriesView />}
        </main>
      </div>
    </div>
  )
}

export default App
