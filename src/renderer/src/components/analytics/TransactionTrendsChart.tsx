import React, { useMemo } from 'react'
import { useTransactionStore } from '@renderer/stores/transactionStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ResponsiveBar } from '@nivo/bar'
import { Skeleton } from '@renderer/components/ui/skeleton'

// Import format currency directly to avoid module issues
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

interface TransactionTrendsChartProps {
  timeFilter?: 'all' | 'month' | 'year'
}

// Update the interface to include index signature for string keys
interface BarData {
  period: string
  expenses: number
  income: number
  expensesColor: string
  incomeColor: string
  // Add timestamp for proper sorting
  timestamp: number
  [key: string]: string | number // Add index signature
}

export function TransactionTrendsChart({ timeFilter = 'month' }: TransactionTrendsChartProps) {
  // Use selector functions to memoize state access and prevent infinite loops
  const transactions = useTransactionStore(state => state.transactions)
  const isLoading = useTransactionStore(state => state.isLoading)

  const { chartData } = useMemo(() => {
    if (!transactions.length) {
      return { chartData: [] }
    }

    const now = new Date()
    const startDate = new Date()
    let dateFormat: Intl.DateTimeFormat
    
    if (timeFilter === 'month') {
      startDate.setMonth(now.getMonth() - 1)
      dateFormat = new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } else if (timeFilter === 'year') {
      startDate.setFullYear(now.getFullYear() - 1)
      dateFormat = new Intl.DateTimeFormat('en-US', { 
        month: 'short',
        year: 'numeric'
      })
    } else {
      // All time
      startDate.setFullYear(now.getFullYear() - 5) // Arbitrary 5 years back for "all"
      dateFormat = new Intl.DateTimeFormat('en-US', { 
        month: 'short',
        year: 'numeric'
      })
    }

    // Filter transactions based on date range
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= startDate && transactionDate <= now
    })

    // Sort transactions by date
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Group data by time periods
    const dataByPeriod: Record<string, { income: number; expenses: number; timestamp: number }> = {}
    
    // Define period formatter based on timeFilter
    const getPeriodKey = (date: Date) => {
      return dateFormat.format(date)
    }

    // Initialize all days/months in the range to ensure continuous data
    if (timeFilter === 'month') {
      // For month view, create entries for each day
      const currentDate = new Date(startDate)
      while (currentDate <= now) {
        const key = dateFormat.format(currentDate)
        dataByPeriod[key] = { 
          income: 0, 
          expenses: 0,
          timestamp: currentDate.getTime()
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else {
      // For year/all view, create entries for each month
      const currentDate = new Date(startDate)
      while (currentDate <= now) {
        const key = dateFormat.format(currentDate)
        dataByPeriod[key] = { 
          income: 0, 
          expenses: 0,
          timestamp: currentDate.getTime()
        }
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    // Aggregate transactions
    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const periodKey = getPeriodKey(date)
      
      // Ensure the period exists in the map
      if (!dataByPeriod[periodKey]) {
        dataByPeriod[periodKey] = { 
          income: 0, 
          expenses: 0,
          timestamp: date.getTime()
        }
      }
      
      if (transaction.amount >= 0) {
        // Income
        dataByPeriod[periodKey].income += transaction.amount
      } else {
        // Expense (store as positive for chart)
        dataByPeriod[periodKey].expenses += Math.abs(transaction.amount)
      }
    })

    // Convert to chart format and sort chronologically by timestamp
    const barData: BarData[] = Object.entries(dataByPeriod)
      .map(([period, data]) => ({
        period,
        expenses: data.expenses,
        income: data.income,
        expensesColor: '#ef4444', // Red
        incomeColor: '#10b981', // Green
        timestamp: data.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    return { chartData: barData }
  }, [transactions, timeFilter])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Trends</CardTitle>
          <CardDescription>Loading transaction trends...</CardDescription>
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
          <CardTitle>Transaction Trends</CardTitle>
          <CardDescription>No transaction data available</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No transactions to analyze for the selected time period
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Trends</CardTitle>
        <CardDescription>
          {timeFilter === 'month' 
            ? 'Last 30 days income and expenses' 
            : timeFilter === 'year' 
              ? 'Last 12 months income and expenses' 
              : 'Historical income and expenses'}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveBar
          data={chartData}
          keys={['expenses', 'income']}
          indexBy="period"
          margin={{ top: 20, right: 30, bottom: 70, left: 80 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ id, data }) => String(data[`${id}Color`])}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Date',
            legendPosition: 'middle',
            legendOffset: 50
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Amount',
            legendPosition: 'middle',
            legendOffset: -60,
            format: value => formatCurrency(value as number).replace('.00', '')
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          enableLabel={false}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 65,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20,
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          tooltip={({ id, value, color }) => (
            <div className="bg-card border rounded-md shadow-md p-2 bg-opacity-100 dark:bg-gray-800 bg-white">
              <strong style={{ color }}>{id === 'expenses' ? 'Expenses' : 'Income'}</strong>
              <div>{formatCurrency(value)}</div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  )
} 