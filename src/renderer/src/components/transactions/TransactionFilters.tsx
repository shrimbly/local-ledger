import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Search, X, Filter, Calendar, AlertTriangle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Switch } from '../ui/switch'
import { Separator } from '../ui/separator'
import { useFilterStore } from '../../stores'
import DateRangeFilter from './DateRangeFilter'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { cn } from '../../lib/utils'

interface TransactionFiltersProps {
  className?: string
}

export function TransactionFilters({ className }: TransactionFiltersProps) {
  const { 
    filters, 
    setSearchQuery, 
    toggleUnexpectedFilter,
    resetFilters,
    hasActiveFilters
  } = useFilterStore()
  
  const [searchInput, setSearchInput] = useState(filters.search)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
  }
  
  const handleClearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }
  
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form 
          onSubmit={handleSearchSubmit}
          className="relative flex-1"
        >
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="pl-8 pr-10"
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* Date Range Filter */}
          <Sheet open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant={filters.dateRange.from || filters.dateRange.to ? "default" : "outline"} 
                size="sm" 
                className="h-9"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Date
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <DateRangeFilter onClose={() => setIsDateFilterOpen(false)} inSheet={true} />
            </SheetContent>
          </Sheet>
          
          {/* Unexpected Filter Toggle */}
          <Button 
            variant={filters.onlyUnexpected ? "default" : "outline"} 
            size="sm"
            className="h-9"
            onClick={() => toggleUnexpectedFilter()}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Unexpected
          </Button>
          
          {/* Reset Filters */}
          {hasActiveFilters() && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-9"
              onClick={resetFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm flex items-center justify-between">
          <div className="text-blue-700">
            <span className="font-medium">Active Filters:</span> {useFilterStore.getState().getFilterSummary()}
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionFilters 