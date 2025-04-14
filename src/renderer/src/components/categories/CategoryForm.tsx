import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Category, CategoryCreateInput, CategoryUpdateInput } from '../../lib/types'
import { createCategory, updateCategory } from '../../services/categoryService'

interface CategoryFormProps {
  category: Category | null
  onSave: () => void
  onCancel: () => void
}

export function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6') // Default blue color
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set initial values when editing an existing category
  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color || '#3b82f6')
    } else {
      // Reset form when adding a new category
      setName('')
      setColor('#3b82f6')
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
          color
        }
        await updateCategory(category.id, updateData)
      } else {
        // Create new category
        const createData: CategoryCreateInput = {
          name,
          color
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