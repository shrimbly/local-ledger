import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select'
import { Button } from '../ui/button'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'

interface ColumnMapperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: string[]
  onColumnsMap: (mapping: ColumnMapping) => void
  data: Array<Record<string, any>>
}

export interface ColumnMapping {
  dateColumn: string
  descriptionColumn: string
  detailsColumn?: string
  amountColumn: string
  dateFormat: 'UK' | 'US'
}

function ColumnMapper({ open, onOpenChange, columns, onColumnsMap, data }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateColumn: '',
    descriptionColumn: '',
    detailsColumn: '',
    amountColumn: '',
    dateFormat: 'UK'
  })

  // Try to auto-detect columns based on common patterns
  useEffect(() => {
    if (columns.length === 0) return

    const possibleDateColumns = columns.filter(col => 
      /date|time|day|month|year/i.test(col)
    )
    
    const possibleDescriptionColumns = columns.filter(col => 
      /desc|item|title|name|transaction/i.test(col)
    )
    
    const possibleDetailsColumns = columns.filter(col => 
      /detail|comment|note|memo|remarks|info|additional/i.test(col)
    )
    
    const possibleAmountColumns = columns.filter(col => 
      /amount|total|sum|price|value|cost/i.test(col)
    )

    setMapping({
      dateColumn: possibleDateColumns[0] || columns[0],
      descriptionColumn: possibleDescriptionColumns[0] || columns[1] || columns[0],
      detailsColumn: possibleDetailsColumns[0] || '',
      amountColumn: possibleAmountColumns[0] || columns[2] || columns[0],
      dateFormat: 'UK'
    })
  }, [columns])

  const handleConfirm = () => {
    onColumnsMap(mapping)
    onOpenChange(false)
  }

  const handleSelectChange = (value: string, field: keyof ColumnMapping) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Validation - only required fields need to be valid
  const isValid = mapping.dateColumn && mapping.descriptionColumn && mapping.amountColumn

  // Generate preview of data with current mapping
  const preview = data.slice(0, 3).map(row => ({
    date: row[mapping.dateColumn],
    description: row[mapping.descriptionColumn],
    details: mapping.detailsColumn ? row[mapping.detailsColumn] : null,
    amount: row[mapping.amountColumn]
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Map CSV Columns to Transaction Fields</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="date-column" className="text-right text-sm font-medium">
              Date
            </label>
            <div className="col-span-3">
              <Select
                value={mapping.dateColumn}
                onValueChange={(value) => handleSelectChange(value, 'dateColumn')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="description-column" className="text-right text-sm font-medium">
              Description
            </label>
            <div className="col-span-3">
              <Select
                value={mapping.descriptionColumn}
                onValueChange={(value) => handleSelectChange(value, 'descriptionColumn')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="details-column" className="text-right text-sm font-medium">
              Details
            </label>
            <div className="col-span-3">
              <Select
                value={mapping.detailsColumn}
                onValueChange={(value) => handleSelectChange(value, 'detailsColumn')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="amount-column" className="text-right text-sm font-medium">
              Amount
            </label>
            <div className="col-span-3">
              <Select
                value={mapping.amountColumn}
                onValueChange={(value) => handleSelectChange(value, 'amountColumn')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="date-format" className="text-right text-sm font-medium">
              Date Format
            </label>
            <div className="col-span-3">
              <RadioGroup
                value={mapping.dateFormat}
                onValueChange={(value: 'UK' | 'US') => handleSelectChange(value, 'dateFormat')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="UK" id="uk-format" />
                  <Label htmlFor="uk-format">DD/MM/YYYY (UK)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="US" id="us-format" />
                  <Label htmlFor="us-format">MM/DD/YYYY (US)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Preview section */}
        {preview.length > 0 && (
          <div className="border rounded-md p-3 my-2">
            <h3 className="text-sm font-medium mb-2">Preview (first 3 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">Date</th>
                    <th className="text-left p-1">Description</th>
                    <th className="text-left p-1">Details</th>
                    <th className="text-right p-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="p-1">{String(row.date)} ({mapping.dateFormat} format)</td>
                      <td className="p-1">{String(row.description)}</td>
                      <td className="p-1">{row.details ? String(row.details) : "-"}</td>
                      <td className="p-1 text-right">{String(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ColumnMapper 