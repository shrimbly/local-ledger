import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Category, CategoryCreateInput, CategoryUpdateInput, SpendingType } from '../../lib/types'
import { createCategory, updateCategory } from '../../services/categoryService'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

// Nice color palette for random assignment
const COLOR_PALETTE = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF5722', // Deep Orange
  '#9C27B0', // Purple
  '#E91E63', // Pink
  '#FFEB3B', // Yellow
  '#00BCD4', // Cyan
  '#FF9800', // Orange
  '#607D8B', // Blue Grey
  '#8BC34A', // Light Green
  '#673AB7', // Deep Purple
  '#FFC107', // Amber
  '#3F51B5', // Indigo
  '#795548', // Brown
  '#009688', // Teal
  '#CDDC39', // Lime
];

interface CategoryFormProps {
  category: Category | null
  onSave: () => void
  onCancel: () => void
}

export function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6') // Default blue color
  const [spendingType, setSpendingType] = useState<SpendingType>('unclassified')
  const [description, setDescription] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get a random color from the palette
  const getRandomColor = (): string => {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  };

  // Set initial values when editing an existing category
  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color || '#3b82f6')
      setSpendingType(category.spendingType || 'unclassified')
      setDescription(category.description || '')
    } else {
      // Reset form when adding a new category
      setName('')
      setColor(getRandomColor())
      setSpendingType('unclassified')
      setDescription('')
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (name.trim() === '') {
        setError('Category name is required')
        return
      }

      if (category) {
        // Update existing category
        const updateData: CategoryUpdateInput = {
          name,
          color,
          spendingType,
          description: description.trim() || null
        }
        await updateCategory(category.id, updateData)
      } else {
        // Create new category
        const createData: CategoryCreateInput = {
          name,
          color,
          spendingType,
          description: description.trim() || undefined
        }
        await createCategory(createData)
      }

      onSave()
    } catch (err) {
      console.error('Error saving category:', err)
      setError('Failed to save category. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a short description of this category"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Provide context about what expenses belong in this category
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="spendingType">Spending Type</Label>
        <Select
          value={spendingType}
          onValueChange={(value) => setSpendingType(value as SpendingType)}
          disabled={isSubmitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select spending type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="essential">Essential - Basic needs</SelectItem>
            <SelectItem value="discretionary">Discretionary - Wants</SelectItem>
            <SelectItem value="mixed">Mixed - Combination</SelectItem>
            <SelectItem value="unclassified">Unclassified</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">
          Classify this category to improve AI analysis of your spending patterns.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Category Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 p-1"
            disabled={isSubmitting}
          />
          <Input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#HEX"
            className="flex-1"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="mt-2">
          <Label className="text-sm mb-1">Quick Colors</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PALETTE.map((paletteColor, index) => (
              <div 
                key={index}
                className={`w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 ${color === paletteColor ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                style={{ backgroundColor: paletteColor }}
                onClick={() => setColor(paletteColor)}
                title={paletteColor}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 mt-2">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
} 