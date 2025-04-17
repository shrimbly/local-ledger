import React, { useMemo, useState, useEffect } from 'react'
import { useTransactionStore } from '@renderer/stores/transactionStore'
import { useCategoryStore } from '@renderer/stores/categoryStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ResponsivePie } from '@nivo/pie'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { SpendingType } from '@renderer/lib/types'
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

// Define formatCurrency locally to avoid import issues
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

const DEFAULT_CATEGORY_COLOR = '#6E6E6E'

interface CategoryBreakdownChartProps {
  timeFilter?: 'all' | 'month' | 'year' | 'week'
  spendingTypeFilter?: SpendingType | 'all' | 'discretionary-mixed'
}

interface ChartData {
  id: string
  label: string
  value: number
  color: string
  spendingType: SpendingType
}

export function CategoryBreakdownChart({ 
  timeFilter = 'all', 
  spendingTypeFilter = 'all' 
}: CategoryBreakdownChartProps) {
  // Add state to track selected category for drilldown
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  // Add state to track whether we're showing all items or just top 5
  const [showAll, setShowAll] = useState(false)
  
  // Use selector functions to memoize state access and prevent infinite loops
  const transactions = useTransactionStore(state => state.transactions)
  const isLoading = useTransactionStore(state => state.isLoading)
  const categories = useCategoryStore(state => state.categories)

  const filterTransactionsByDate = useMemo(() => {
    return (transactions: any[]) => {
      if (timeFilter === 'all') return transactions
      
      const now = new Date()
      const startDate = new Date()
      
      if (timeFilter === 'week') {
        // Last 3 months for weekly analysis
        startDate.setMonth(now.getMonth() - 3)
      } else if (timeFilter === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      } else if (timeFilter === 'year') {
        startDate.setFullYear(now.getFullYear() - 1)
      }
      
      return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= startDate && transactionDate <= now
      })
    }
  }, [timeFilter])

  const { chartData, totalExpense, topCategories, selectedCategory, drilldownData, allExpenseCategories } = useMemo(() => {
    if (!transactions.length) {
      return { 
        chartData: [], 
        totalExpense: 0, 
        topCategories: [],
        selectedCategory: null,
        drilldownData: [],
        allExpenseCategories: []
      }
    }

    const filteredTransactions = filterTransactionsByDate(transactions)
    
    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    let totalExpense = 0
    
    // Transactions grouped by category for potential drilldown
    const transactionsByCategory: Record<string, any[]> = {}

    filteredTransactions.forEach(transaction => {
      // Only include expenses (negative amounts)
      if (transaction.amount >= 0) return

      const categoryId = transaction.categoryId || 'no-category'
      // Skip transactions if they don't match the spending type filter
      if (spendingTypeFilter !== 'all') {
        const category = categories.find(c => c.id === categoryId)
        if (!category) return
        
        // Special handling for the combined discretionary+mixed filter
        if (spendingTypeFilter === 'discretionary-mixed') {
          if (category.spendingType !== 'discretionary' && category.spendingType !== 'mixed') return
        } else {
          // For all other filters, exact match is required
          if (category.spendingType !== spendingTypeFilter) return
        }
      }
      
      const absAmount = Math.abs(transaction.amount)
      
      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = 0
        transactionsByCategory[categoryId] = []
      }
      
      expensesByCategory[categoryId] += absAmount
      totalExpense += absAmount
      transactionsByCategory[categoryId].push(transaction)
    })

    // Prepare chart data
    let chartData: ChartData[] = Object.entries(expensesByCategory).map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId)
      return {
        id: categoryId,
        label: category?.name || 'Uncategorized',
        value: amount,
        color: category?.color || DEFAULT_CATEGORY_COLOR,
        spendingType: category?.spendingType || 'unclassified'
      }
    })

    // Sort from smallest to largest for the chart display
    const sortedChartData = [...chartData].sort((a, b) => a.value - b.value)

    // All expense categories for the "Show All" view
    const allExpenseCategories = [...chartData]
      .sort((a, b) => b.value - a.value)
      .map(cat => ({
        ...cat,
        percentage: (cat.value / totalExpense) * 100
      }))

    // Sort by value (highest first) for the top categories list
    const topCategories = [...chartData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(cat => ({
        ...cat,
        percentage: (cat.value / totalExpense) * 100
      }))
    
    // Get selected category details
    const selectedCategory = selectedCategoryId 
      ? categories.find(c => c.id === selectedCategoryId) 
      : null
    
    // Generate drilldown data for the selected category
    let drilldownData: ChartData[] = []
    if (selectedCategoryId && transactionsByCategory[selectedCategoryId]) {
      // Group transactions by description
      const expensesByDescription: Record<string, number> = {}
      
      transactionsByCategory[selectedCategoryId].forEach(transaction => {
        const key = transaction.description || 'Unnamed'
        if (!expensesByDescription[key]) {
          expensesByDescription[key] = 0
        }
        expensesByDescription[key] += Math.abs(transaction.amount)
      })
      
      // Convert to chart data
      drilldownData = Object.entries(expensesByDescription)
        .map(([description, amount]) => ({
          id: description,
          label: description,
          value: amount,
          color: selectedCategory?.color || DEFAULT_CATEGORY_COLOR,
          spendingType: selectedCategory?.spendingType || 'unclassified'
        }))
        .sort((a, b) => a.value - b.value)
    }

    return { 
      chartData: sortedChartData, 
      totalExpense, 
      topCategories,
      selectedCategory,
      drilldownData,
      allExpenseCategories
    }
  }, [transactions, categories, timeFilter, spendingTypeFilter, filterTransactionsByDate, selectedCategoryId])

  const handlePieClick = (data: any) => {
    setSelectedCategoryId(data.id)
    setShowAll(false) // Reset to showing top items when changing views
  }
  
  const handleBackClick = () => {
    setSelectedCategoryId(null)
    setShowAll(false) // Reset to showing top items when changing views
  }

  const toggleShowAll = () => {
    setShowAll(!showAll)
  }

  // For debugging purposes
  useEffect(() => {
    if (selectedCategoryId) {
      console.log(`Drilldown data count: ${drilldownData.length}`)
    } else {
      console.log(`All categories count: ${allExpenseCategories.length}`)
      console.log(`Top categories count: ${topCategories.length}`)
    }
  }, [selectedCategoryId, drilldownData.length, allExpenseCategories.length, topCategories.length, showAll])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Loading spending by category...</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!chartData.length && !drilldownData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>No expense data available</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No expense transactions to analyze
          </p>
        </CardContent>
      </Card>
    )
  }

  // Determine which data to display in chart
  const displayData = selectedCategoryId ? drilldownData : chartData

  // Get the list of items to display in the "Top Categories" or "Top Expenses" section
  const itemsToDisplay = selectedCategoryId
    ? (showAll ? drilldownData : drilldownData.slice(0, 5)).sort((a, b) => b.value - a.value)
    : (showAll ? allExpenseCategories : topCategories);

  // Count of total items vs displayed items
  const totalItemCount = selectedCategoryId ? drilldownData.length : allExpenseCategories.length;
  const shouldShowMoreButton = totalItemCount > 5;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-1">
        {selectedCategoryId ? (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleBackClick}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              {selectedCategory?.name || 'Category'} Expenses
            </CardTitle>
          </div>
        ) : (
          <CardTitle className="text-lg">
            {spendingTypeFilter === 'all' 
              ? 'Category Breakdown' 
              : spendingTypeFilter === 'discretionary-mixed'
                ? 'Discretionary + Mixed Category Breakdown'
                : `${spendingTypeFilter.charAt(0).toUpperCase() + spendingTypeFilter.slice(1)} Category Breakdown`}
          </CardTitle>
        )}
        <CardDescription>
          {selectedCategoryId 
            ? `Individual expenses in ${selectedCategory?.name || 'selected category'}`
            : `${timeFilter === 'all' ? 'All time' : timeFilter === 'month' ? 'Last 30 days' : timeFilter === 'week' ? 'Last 3 months (Weekly)' : 'Last 12 months'} spending by category`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsivePie
            data={displayData}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            colors={{ datum: 'data.color' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            enableArcLabels={false}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#888888"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLinkLabel="label"
            onClick={!selectedCategoryId ? handlePieClick : undefined}
            tooltip={({ datum }) => (
              <div className="bg-white dark:bg-gray-800 border rounded-md shadow-md p-2 bg-opacity-100">
                <strong>{datum.label}</strong>
                <div>{formatCurrency(datum.value as number)}</div>
                <div>{((datum.value as number / (selectedCategoryId ? drilldownData.reduce((acc, d) => acc + d.value, 0) : totalExpense)) * 100).toFixed(1)}%</div>
                {!selectedCategoryId && <div className="text-xs italic mt-1">Click to see details</div>}
              </div>
            )}
          />
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">
              {selectedCategoryId ? 'Top Expenses' : 'Top Categories'} 
              {showAll ? ' (All)' : ''}
            </h4>
            {shouldShowMoreButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleShowAll}
                className="h-8 text-xs flex items-center gap-1"
              >
                {showAll ? (
                  <>Show Less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Show All ({totalItemCount}) <ChevronDown className="h-3 w-3" /></>
                )}
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {itemsToDisplay.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex justify-between items-center">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-[200px]">{item.label}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(item.value)} ({((item.value / (selectedCategoryId ? drilldownData.reduce((acc, d) => acc + d.value, 0) : totalExpense)) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
            
            {!showAll && shouldShowMoreButton && (
              <div className="text-center text-sm text-muted-foreground pt-2">
                {totalItemCount - 5} more items not shown
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 