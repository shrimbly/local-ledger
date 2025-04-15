import React, { useState, useEffect } from 'react'
import { useFilterStore, useCategoryStore } from '../../stores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { Button } from '../ui/button'
import { X } from 'lucide-react'
import { Separator } from '../ui/separator'

export function CategoryFilter() {
  const { filters, setCategoryFilters } = useFilterStore()
  const { categories } = useCategoryStore()
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(filters.categories)

  // Update local state when filters change
  useEffect(() => {
    setSelectedCategoryIds(filters.categories)
  }, [filters.categories])

  // Apply category filter changes
  const handleCategoryChange = (categoryId: string) => {
    // Toggle selection
    const newSelection = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter(id => id !== categoryId)
      : [...selectedCategoryIds, categoryId]
    
    setSelectedCategoryIds(newSelection)
    setCategoryFilters(newSelection)
  }

  // Reset category filter
  const handleClearCategories = () => {
    setSelectedCategoryIds([])
    setCategoryFilters([])
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Filter by Category</h3>
        {selectedCategoryIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCategories}
            className="h-8 px-2 text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({selectedCategoryIds.length})
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {categories.map(category => (
          <div key={category.id} className="flex items-center">
            <Button
              variant={selectedCategoryIds.includes(category.id) ? "default" : "outline"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleCategoryChange(category.id)}
            >
              <div className="flex items-center w-full">
                {category.color && (
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span>{category.name}</span>
              </div>
            </Button>
          </div>
        ))}
        
        <div className="mt-2">
          <Button
            variant={selectedCategoryIds.length === 0 ? "default" : "outline"}
            size="sm"
            className="w-full justify-start"
            onClick={handleClearCategories}
          >
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
              <span>All Categories</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
} 