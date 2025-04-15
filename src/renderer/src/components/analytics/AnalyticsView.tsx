import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { CategoryBreakdownChart } from './CategoryBreakdownChart'
import { TransactionTrendsChart } from './TransactionTrendsChart'
import { MonthlyIncomeSummary } from './MonthlyIncomeSummary'
import { AiAnalysisView } from './AiAnalysisView'
import { SpendingTrendChart } from './SpendingTrendChart'

export function AnalyticsView() {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'year'>('month')

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="space-x-2">
          <Button 
            variant={timeFilter === 'month' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeFilter('month')}
          >
            Last 30 Days
          </Button>
          <Button 
            variant={timeFilter === 'year' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeFilter('year')}
          >
            Last 12 Months
          </Button>
          <Button 
            variant={timeFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeFilter('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <MonthlyIncomeSummary timeFilter={timeFilter} />
      </div>

      {/* AI Analysis Section */}
      <AiAnalysisView timeFilter={timeFilter} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryBreakdownChart timeFilter={timeFilter} />
        <TransactionTrendsChart timeFilter={timeFilter} />
      </div>

      {/* Advanced Spending Trends */}
      <SpendingTrendChart timeFilter={timeFilter} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analytics Insights</CardTitle>
          <CardDescription>
            Use these charts to better understand your spending habits and financial patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The charts above show your income and expenses broken down by category and over time.
            Use the time filter buttons to adjust the date range for analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsView 