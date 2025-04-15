import React, { useState } from 'react'
import { Button } from '../ui/button'
import { useCategoryStore } from '../../stores'
import { updateTransaction } from '../../services/transactionService'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { cn } from "../../lib/utils"

interface SimpleCategorySelectorProps {
  transactionId: string
  className?: string
}

export function SimpleCategorySelector({ transactionId, className }: SimpleCategorySelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { categories, getCategoryColor } = useCategoryStore()

  const handleCategoryChange = async (categoryId: string) => {
    setIsLoading(true)
    try {
      await updateTransaction(transactionId, { categoryId })
      // Reload to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Select onValueChange={handleCategoryChange} disabled={isLoading}>
      <SelectTrigger className={cn("w-[180px] text-gray-400", className)}>
        <SelectValue placeholder={isLoading ? "Updating..." : "Uncategorized"} />
      </SelectTrigger>
      <SelectContent 
        className="max-h-[200px] overflow-y-auto"
        position="popper"
        side="top"
        sideOffset={5}
        align="start"
        avoidCollisions
      >
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center">
              {category.color && (
                <span 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: category.color }}
                />
              )}
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 