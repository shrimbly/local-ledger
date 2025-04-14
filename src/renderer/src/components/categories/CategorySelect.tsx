import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '../ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { cn } from '../../lib/utils'
import { Category } from '../../lib/types'
import { getAllCategories } from '../../services/categoryService'

interface CategorySelectProps {
  value: string | null | undefined
  onSelect: (categoryId: string | null) => void
}

export function CategorySelect({ value, onSelect }: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Find the selected category
  const selectedCategory = categories.find(category => category.id === value)

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const data = await getAllCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-8"
        >
          {selectedCategory ? (
            <div className="flex items-center">
              {selectedCategory.color && (
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: selectedCategory.color }}
                />
              )}
              <span>{selectedCategory.name}</span>
            </div>
          ) : (
            "Select category..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandEmpty>
            {isLoading ? 'Loading...' : 'No category found.'}
          </CommandEmpty>
          <CommandGroup>
            <CommandItem
              key="clear"
              onSelect={() => {
                onSelect(null)
                setOpen(false)
              }}
              className="text-sm"
            >
              <div className="flex items-center">
                <span>No category</span>
              </div>
            </CommandItem>
            {categories.map((category) => (
              <CommandItem
                key={category.id}
                onSelect={() => {
                  onSelect(category.id)
                  setOpen(false)
                }}
                className="text-sm"
              >
                <div className="flex items-center">
                  {category.color && (
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <span>{category.name}</span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === category.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 