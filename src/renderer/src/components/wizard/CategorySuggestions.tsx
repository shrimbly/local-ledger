import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { type Transaction, type CategorySuggestion } from '../../lib/types'
import { CheckCircle, RefreshCw, ThumbsUp } from 'lucide-react'

interface CategorySuggestionsProps {
  transaction: Transaction
  isLoading: boolean
  suggestions: CategorySuggestion[]
  onSelectCategory: (category: string) => void
  onRequestSuggestions?: () => void
}

export function CategorySuggestions({
  transaction,
  isLoading,
  suggestions = [],
  onSelectCategory,
  onRequestSuggestions
}: CategorySuggestionsProps) {
  if (isLoading) {
    return <CategorySuggestionsSkeleton />
  }

  // Function to handle category selection that also navigates to next transaction
  const handleCategorySelect = (category: string) => {
    onSelectCategory(category);
    // The actual navigation happens in the parent component via the onSelectCategory handler
  };

  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center">
            <ThumbsUp className="mr-2 h-4 w-4 text-primary" />
            AI Recommendations
          </CardTitle>
          {onRequestSuggestions && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestSuggestions}
              disabled={isLoading}
              className="flex items-center"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Analyze
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                {onRequestSuggestions ? (
                  <span>Click analyze to get AI suggestions</span>
                ) : (
                  <span>No suggestions available</span>
                )}
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className={`category-suggestion group relative w-full rounded-md border p-4 
                    transition-all duration-150 ease-in-out
                    ${index === 0 ? 'border-primary bg-primary/5' : 'hover:border-primary hover:bg-primary/5'} 
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                  onClick={() => handleCategorySelect(suggestion.category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {index === 0 && <CheckCircle className="mr-2 h-4 w-4 text-primary" />}
                      <span className={`text-sm font-medium ${index === 0 ? 'text-primary' : ''}`}>
                        {suggestion.category}
                      </span>
                    </div>
                    <Badge 
                      variant={getConfidenceBadgeVariant(suggestion.confidence)}
                      className="transition-transform group-hover:scale-110"
                    >
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                  {suggestion.explanation && (
                    <p className="mt-2 text-sm text-muted-foreground text-left">
                      {suggestion.explanation}
                    </p>
                  )}
                  <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-primary/30 pointer-events-none" />
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Category */}
      <Card className={transaction.category ? "border-green-200 bg-green-50/30" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            {transaction.category ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-800">Current Category</span>
              </>
            ) : (
              <span>Current Category</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            {transaction.category ? (
              <div className="flex items-center space-x-2">
                <span className="font-medium text-green-800">{transaction.category.name}</span>
                {transaction.category.color && (
                  <div
                    className="w-4 h-4 rounded-full border border-green-300"
                    style={{ backgroundColor: transaction.category.color }}
                  />
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">No category assigned</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getConfidenceBadgeVariant(confidence: number): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.5) return 'default'
  if (confidence >= 0.3) return 'secondary'
  return 'destructive'
}

function CategorySuggestionsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">AI Recommendations</CardTitle>
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[80px] w-full" />
          <Skeleton className="h-[80px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
    </div>
  )
} 