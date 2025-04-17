import { useMemo } from 'react'
import { useTransactionStore, useCategoryStore } from '@renderer/stores'
import { filterTransactionsByDate } from '@renderer/lib/dataAggregation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { formatCurrency } from '@renderer/lib/utils'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface CategoryTrendChartProps {
  timeFilter: 'week' | 'month' | 'year' | 'all'
}

export function CategoryTrendChart({ timeFilter }: CategoryTrendChartProps) {
  const { transactions, isLoading } = useTransactionStore()
  const { categories } = useCategoryStore()
  
  const { chartData, topCategories } = useMemo(() => {
    if (!transactions.length || !categories.length) {
      return { chartData: [], topCategories: [] }
    }
    
    // Filter transactions based on date range
    const filteredTransactions = filterTransactionsByDate(transactions, timeFilter)
    
    // Only include expense transactions (negative amounts)
    const expenseTransactions = filteredTransactions.filter(t => t.amount < 0)
    
    if (!expenseTransactions.length) {
      return { chartData: [], topCategories: [] }
    }
    
    // Determine time bucket based on filter
    let dateFormat: (date: Date) => string
    
    if (timeFilter === 'week') {
      // For week filter, group by week number within the 3-month period
      dateFormat = (date: Date) => {
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
        
        // Format as Week X (Month)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `W${weekNumber} (${monthNames[date.getMonth()]})`
      }
    } else if (timeFilter === 'month') {
      // For month view, group by day
      dateFormat = (date: Date) => `${date.getDate()}`
    } else if (timeFilter === 'year') {
      // For year view, group by month
      dateFormat = (date: Date) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return monthNames[date.getMonth()]
      }
    } else {
      // For all time, group by month-year
      dateFormat = (date: Date) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      }
    }
    
    // Calculate total expense per category
    const expensesByCategory: Record<string, number> = {}
    let totalExpense = 0
    
    expenseTransactions.forEach(transaction => {
      const categoryId = transaction.categoryId || 'uncategorized'
      const absAmount = Math.abs(transaction.amount)
      
      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = 0
      }
      
      expensesByCategory[categoryId] += absAmount
      totalExpense += absAmount
    })
    
    // Get top 5 categories by total expense
    const topCategoriesIds = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
    
    const topCategoriesWithInfo = topCategoriesIds.map(id => {
      const category = categories.find(c => c.id === id) || {
        id: 'uncategorized',
        name: 'Uncategorized',
        color: '#6E6E6E' // Default color
      }
      
      return {
        id,
        name: category.name,
        color: category.color || '#6E6E6E',
        amount: expensesByCategory[id],
        percentage: (expensesByCategory[id] / totalExpense) * 100
      }
    })
    
    // Create data structure for chart, grouped by time period and category
    const dataByPeriod: Record<string, {
      date: string,
      timestamp: number,
      [categoryId: string]: number | string
    }> = {}
    
    // Sort transactions by date
    const sortedTransactions = [...expenseTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Process transactions
    sortedTransactions.forEach(transaction => {
      // Skip if not in top categories
      const categoryId = transaction.categoryId || 'uncategorized'
      if (!topCategoriesIds.includes(categoryId)) return
      
      const date = new Date(transaction.date)
      const periodKey = dateFormat(date)
      
      if (!dataByPeriod[periodKey]) {
        dataByPeriod[periodKey] = {
          date: periodKey,
          timestamp: date.getTime(),
        }
        
        // Initialize all top categories to 0
        topCategoriesIds.forEach(catId => {
          dataByPeriod[periodKey][catId] = 0
        })
      }
      
      const absAmount = Math.abs(transaction.amount)
      dataByPeriod[periodKey][categoryId] = 
        (dataByPeriod[periodKey][categoryId] as number || 0) + absAmount
    })
    
    // Convert to array and sort by date
    const chartData = Object.values(dataByPeriod)
      .sort((a, b) => a.timestamp - b.timestamp)
    
    return { 
      chartData, 
      topCategories: topCategoriesWithInfo 
    }
  }, [transactions, categories, timeFilter])
  
  // Format date range based on filter
  const dateRangeText = useMemo(() => {
    switch (timeFilter) {
      case 'week':
        return 'Last 3 Months (Weekly)'
      case 'month':
        return 'Last 30 Days'
      case 'year':
        return 'Last 12 Months'
      default:
        return 'All Time'
    }
  }, [timeFilter])
  
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md rounded-md border">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((item: any, index: number) => (
            <p 
              key={index}
              className="text-sm"
              style={{ color: item.color }}
            >
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Category Spending Trends</CardTitle>
        <CardDescription>{dateRangeText}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value).replace('$', '')} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {topCategories.map(category => (
                  <Line 
                    key={category.id}
                    type="monotone" 
                    dataKey={category.id}
                    name={category.name}
                    stroke={category.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No expense data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CategoryTrendChart 