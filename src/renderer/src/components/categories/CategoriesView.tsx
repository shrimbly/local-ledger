import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Plus, List } from 'lucide-react'
import { getAllCategories } from '../../services/categoryService'
import { Category } from '../../lib/types'
import { CategoryTable } from './CategoryTable'
import { CategoryForm } from './CategoryForm'
import { BulkCategoryForm } from './BulkCategoryForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getAllCategories()
      setCategories(data)
    } catch (err) {
      setError('Failed to fetch categories. Please try again.')
      console.error('Error fetching categories:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const handleBulkAddClick = () => {
    setBulkDialogOpen(true)
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const handleCategoryChange = () => {
    fetchCategories()
    setDialogOpen(false)
    setBulkDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
        <div className="flex space-x-2">
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
          <Button variant="outline" onClick={handleBulkAddClick}>
            <List className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded">
          {error}
        </div>
      )}

      <CategoryTable 
        categories={categories} 
        isLoading={isLoading} 
        onEdit={handleEditClick}
        onCategoryChange={handleCategoryChange}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm 
            category={editingCategory}
            onSave={handleCategoryChange}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Categories</DialogTitle>
          </DialogHeader>
          <BulkCategoryForm 
            onComplete={handleCategoryChange}
            onCancel={() => setBulkDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 