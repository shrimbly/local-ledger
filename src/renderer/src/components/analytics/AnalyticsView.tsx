import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { CategoryBreakdownChart } from './CategoryBreakdownChart'
import { TransactionTrendsChart } from './TransactionTrendsChart'
import { MonthlyIncomeSummary } from './MonthlyIncomeSummary'
import { AiAnalysisView } from './AiAnalysisView'
import { SpendingTrendChart } from './SpendingTrendChart'
import { CategoryTrendChart } from './CategoryTrendChart'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@renderer/components/ui/select'
import { SpendingType } from '@renderer/lib/types'

export function AnalyticsView() {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'year' | 'week'>('month')
  const [spendingTypeFilter, setSpendingTypeFilter] = useState<SpendingType | 'all'>('all')

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="space-x-2">
          <Button 
            variant={timeFilter === 'week' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeFilter('week')}
          >
            Last 3 Months (Weekly)
          </Button>
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
        <div>
          <div className="flex justify-end mb-2">
            <Select
              value={spendingTypeFilter}
              onValueChange={(value) => setSpendingTypeFilter(value as SpendingType | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="essential">Essential</SelectItem>
                <SelectItem value="discretionary">Discretionary</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="discretionary-mixed">Discretionary + Mixed</SelectItem>
                <SelectItem value="unclassified">Unclassified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CategoryBreakdownChart 
            timeFilter={timeFilter} 
            spendingTypeFilter={spendingTypeFilter} 
          />
        </div>
        <TransactionTrendsChart timeFilter={timeFilter} />
      </div>

      {/* Advanced Spending Trends */}
      <SpendingTrendChart timeFilter={timeFilter} />
      
      {/* Category Trend Chart */}
      <div className="my-6">
        <CategoryTrendChart timeFilter={timeFilter} />
      </div>

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
            For more detailed analysis, use the spending type filter to focus on needs, wants, or savings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsView 