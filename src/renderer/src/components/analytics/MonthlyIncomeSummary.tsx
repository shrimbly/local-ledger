import { useEffect, useMemo, useState } from 'react'
import { useTransactionStore } from '@renderer/stores/transactionStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatCurrency } from '@renderer/lib/format'

interface MonthlyIncomeSummaryProps {
  timeFilter: 'all' | 'month' | 'year'
}

interface MonthlySummary {
  income: number
  expenses: number
  netIncome: number
  previousIncome?: number
  previousExpenses?: number
  incomeChangePercent?: number
  expensesChangePercent?: number
}

export function MonthlyIncomeSummary({ timeFilter }: MonthlyIncomeSummaryProps) {
  const { transactions, isLoading } = useTransactionStore()
  const [summary, setSummary] = useState<MonthlySummary>({
    income: 0,
    expenses: 0,
    netIncome: 0
  })

  // Calculate summary data based on time filter
  useEffect(() => {
    if (isLoading || !transactions.length) return

    let filteredTransactions = [...transactions]
    const now = new Date()
    let compareDate: Date | null = null

    // Filter transactions based on time filter
    if (timeFilter === 'month') {
      // Last 30 days
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      
      // For previous period comparison
      compareDate = new Date(thirtyDaysAgo)
      compareDate.setDate(compareDate.getDate() - 30)
      
      filteredTransactions = transactions.filter(t => 
        new Date(t.date) >= thirtyDaysAgo
      )
    } else if (timeFilter === 'year') {
      // Last 12 months
      const oneYearAgo = new Date(now)
      oneYearAgo.setFullYear(now.getFullYear() - 1)
      
      // For previous period comparison
      compareDate = new Date(oneYearAgo)
      compareDate.setFullYear(compareDate.getFullYear() - 1)
      
      filteredTransactions = transactions.filter(t => 
        new Date(t.date) >= oneYearAgo
      )
    }
    
    // Calculate current period income and expenses
    const income = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    let previousIncome = 0
    let previousExpenses = 0
    
    // Calculate previous period for comparison
    if (compareDate && (timeFilter === 'month' || timeFilter === 'year')) {
      const previousPeriodEnd = timeFilter === 'month' 
        ? new Date(now.setDate(now.getDate() - 30)) 
        : new Date(now.setFullYear(now.getFullYear() - 1))
        
      const previousPeriodStart = compareDate
      
      const previousTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= previousPeriodStart && transactionDate < previousPeriodEnd
      })
      
      previousIncome = previousTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
      
      previousExpenses = previousTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }
    
    // Calculate percentage changes
    const incomeChangePercent = previousIncome > 0
      ? ((income - previousIncome) / previousIncome) * 100
      : 0
      
    const expensesChangePercent = previousExpenses > 0
      ? ((expenses - previousExpenses) / previousExpenses) * 100
      : 0
    
    setSummary({
      income,
      expenses,
      netIncome: income - expenses,
      previousIncome: previousIncome || undefined,
      previousExpenses: previousExpenses || undefined,
      incomeChangePercent: isFinite(incomeChangePercent) ? incomeChangePercent : undefined,
      expensesChangePercent: isFinite(expensesChangePercent) ? expensesChangePercent : undefined
    })
  }, [transactions, isLoading, timeFilter])

  // Memoize period text
  const periodText = useMemo(() => {
    switch (timeFilter) {
      case 'month':
        return 'Last 30 Days'
      case 'year':
        return 'Last 12 Months'
      default:
        return 'All Time'
    }
  }, [timeFilter])

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Monthly Summary</CardTitle>
          <CardDescription>Loading financial data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!transactions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Monthly Summary</CardTitle>
          <CardDescription>No transaction data available</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Financial Summary</CardTitle>
        <CardDescription>{periodText}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Income Card */}
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Income</h3>
              {summary.incomeChangePercent !== undefined && (
                <div className={`flex items-center text-xs ${summary.incomeChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.incomeChangePercent >= 0 ? (
                    <ArrowUp className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(summary.incomeChangePercent).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.income)}</p>
          </div>
          
          {/* Expenses Card */}
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Expenses</h3>
              {summary.expensesChangePercent !== undefined && (
                <div className={`flex items-center text-xs ${summary.expensesChangePercent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.expensesChangePercent <= 0 ? (
                    <ArrowDown className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowUp className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(summary.expensesChangePercent).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.expenses)}</p>
          </div>
          
          {/* Net Income Card */}
          <div className={`p-4 ${summary.netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-amber-50 dark:bg-amber-950'} rounded-lg`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Net Income</h3>
            </div>
            <p className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatCurrency(summary.netIncome)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MonthlyIncomeSummary 