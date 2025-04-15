import React, { useMemo } from 'react'
import { useTransactionStore } from '@renderer/stores/transactionStore'
import { useCategoryStore } from '@renderer/stores/categoryStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ResponsivePie } from '@nivo/pie'
import { Skeleton } from '@renderer/components/ui/skeleton'

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
  timeFilter?: 'all' | 'month' | 'year'
}

interface ChartData {
  id: string
  label: string
  value: number
  color: string
}

export function CategoryBreakdownChart({ timeFilter = 'all' }: CategoryBreakdownChartProps) {
  // Use selector functions to memoize state access and prevent infinite loops
  const transactions = useTransactionStore(state => state.transactions)
  const isLoading = useTransactionStore(state => state.isLoading)
  const categories = useCategoryStore(state => state.categories)

  const filterTransactionsByDate = useMemo(() => {
    return (transactions: any[]) => {
      if (timeFilter === 'all') return transactions
      
      const now = new Date()
      const startDate = new Date()
      
      if (timeFilter === 'month') {
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

  const { chartData, totalExpense, topCategories } = useMemo(() => {
    if (!transactions.length) {
      return { chartData: [], totalExpense: 0, topCategories: [] }
    }

    const filteredTransactions = filterTransactionsByDate(transactions)
    
    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    let totalExpense = 0

    filteredTransactions.forEach(transaction => {
      // Only include expenses (negative amounts)
      if (transaction.amount >= 0) return

      const categoryId = transaction.categoryId || 'no-category'
      const absAmount = Math.abs(transaction.amount)
      
      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = 0
      }
      
      expensesByCategory[categoryId] += absAmount
      totalExpense += absAmount
    })

    // Prepare chart data
    const chartData: ChartData[] = Object.entries(expensesByCategory).map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId)
      return {
        id: categoryId,
        label: category?.name || 'Uncategorized',
        value: amount,
        color: category?.color || DEFAULT_CATEGORY_COLOR
      }
    })

    // Sort by value (highest first) and calculate percentages for top categories
    const topCategories = [...chartData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(cat => ({
        ...cat,
        percentage: (cat.value / totalExpense) * 100
      }))

    return { chartData, totalExpense, topCategories }
  }, [transactions, categories, timeFilter])

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

  if (!chartData.length) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>
          {timeFilter === 'all' ? 'All time' : timeFilter === 'month' ? 'Last 30 days' : 'Last 12 months'} spending by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsivePie
            data={chartData}
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
            tooltip={({ datum }) => (
              <div className="bg-white dark:bg-gray-800 border rounded-md shadow-md p-2 bg-opacity-100">
                <strong>{datum.label}</strong>
                <div>{formatCurrency(datum.value as number)}</div>
                <div>{((datum.value as number / totalExpense) * 100).toFixed(1)}%</div>
              </div>
            )}
          />
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Top Categories</h4>
          <div className="space-y-2">
            {topCategories.map(category => (
              <div key={category.id} className="flex justify-between items-center">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.label}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(category.value)} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 