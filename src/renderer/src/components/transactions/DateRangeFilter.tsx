import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar } from '../ui/calendar'
import { Button } from '../ui/button'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { DateRange } from '../../stores/filterStore'
import { useFilterStore } from '../../stores'
import { DateRange as DayPickerDateRange } from 'react-day-picker'

interface DateRangeFilterProps {
  onClose?: () => void
  inSheet?: boolean
}

export function DateRangeFilter({ onClose, inSheet = true }: DateRangeFilterProps) {
  const { filters, setDateRange } = useFilterStore()
  
  // Initialize local state with store values
  const [date, setDate] = useState<DayPickerDateRange | undefined>(
    filters.dateRange.from || filters.dateRange.to 
      ? { 
          from: filters.dateRange.from || undefined, 
          to: filters.dateRange.to || undefined 
        } 
      : undefined
  )

  // When local date changes, update the filter store
  useEffect(() => {
    setDateRange({
      from: date?.from || null,
      to: date?.to || null
    })
  }, [date, setDateRange])

  // Handle clearing the date range
  const handleClear = () => {
    setDate(undefined)
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Date Range</h3>
        {onClose && !inSheet && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="grid gap-2">
        <div className="grid gap-2">
          <Button
            id="date-trigger"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM d, yyyy")} - {format(date.to, "MMM d, yyyy")}
                </>
              ) : (
                format(date.from, "MMM d, yyyy")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
          
          <div className="rounded-md border bg-white dark:bg-gray-800 shadow-sm">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClear}
          disabled={!date?.from && !date?.to}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

export default DateRangeFilter 