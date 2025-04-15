import { useMemo } from 'react'
import { useTransactionStore, useCategoryStore } from '@renderer/stores'
import { filterTransactionsByDate } from '@renderer/lib/dataAggregation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { formatCurrency } from '@renderer/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SpendingTrendChartProps {
  timeFilter: 'all' | 'month' | 'year'
}

export function SpendingTrendChart({ timeFilter }: SpendingTrendChartProps) {
  const { transactions, isLoading } = useTransactionStore()
  const { categories } = useCategoryStore()
  
  const chartData = useMemo(() => {
    if (!transactions.length) return []
    
    // Filter transactions based on date range
    const filteredTransactions = filterTransactionsByDate(transactions, timeFilter)
    
    // Determine time bucket based on filter
    let dateFormat: (date: Date) => string
    
    if (timeFilter === 'month') {
      // For month view, group by day
      dateFormat = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`
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
    
    // Create accumulative data structure
    const accumulativeData: Record<string, {
      date: string,
      expenses: number,
      income: number,
      netBalance: number,
      timestamp: number // For sorting
    }> = {}
    
    // Sort transactions by date
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Process transactions
    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const periodKey = dateFormat(date)
      
      if (!accumulativeData[periodKey]) {
        accumulativeData[periodKey] = {
          date: periodKey,
          expenses: 0,
          income: 0,
          netBalance: 0,
          timestamp: date.getTime()
        }
      }
      
      const amount = transaction.amount
      
      if (amount < 0) {
        accumulativeData[periodKey].expenses += Math.abs(amount)
      } else {
        accumulativeData[periodKey].income += amount
      }
      
      accumulativeData[periodKey].netBalance = 
        accumulativeData[periodKey].income - accumulativeData[periodKey].expenses
    })
    
    // Convert to array and sort by date
    return Object.values(accumulativeData)
      .sort((a, b) => a.timestamp - b.timestamp)
      
  }, [transactions, timeFilter])
  
  // Format date range based on filter
  const dateRangeText = useMemo(() => {
    switch (timeFilter) {
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
        <CardTitle className="text-xl">Spending Trends</CardTitle>
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
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  name="Income" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  name="Expenses" 
                  strokeWidth={2} 
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="netBalance" 
                  stroke="#6366f1" 
                  name="Net Balance" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SpendingTrendChart 