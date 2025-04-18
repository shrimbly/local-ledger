import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table'
import { Button } from '../ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { Category, SpendingType } from '../../lib/types'
import { deleteCategory } from '../../services/categoryService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog'
import { cn } from '../../lib/utils'

// Spending type badge component
function SpendingTypeBadge({ type }: { type: SpendingType | undefined }) {
  const getTypeColor = (type: SpendingType | undefined): string => {
    switch (type) {
      case 'essential':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discretionary':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'mixed':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'unclassified':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: SpendingType | undefined): string => {
    if (!type) return 'Unclassified';
    // Capitalize first letter
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <span className={cn(
      'px-2 py-1 text-xs font-medium rounded-full border',
      getTypeColor(type)
    )}>
      {getTypeLabel(type)}
    </span>
  );
}

interface CategoryTableProps {
  categories: Category[]
  isLoading: boolean
  onEdit: (category: Category) => void
  onCategoryChange: () => void
}

export function CategoryTable({ 
  categories, 
  isLoading,
  onEdit,
  onCategoryChange
}: CategoryTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Category>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  // Handle column header click for sorting
  const handleSort = (column: keyof Category) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort categories based on current sort state
  const sortedCategories = [...categories].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === bValue) return 0
    
    // Handle different data types
    let comparison = 0
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else if (
      sortColumn === 'createdAt' || 
      sortColumn === 'updatedAt'
    ) {
      comparison = new Date(a[sortColumn]).getTime() - new Date(b[sortColumn]).getTime()
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Generate sort indicator
  const getSortIndicator = (column: keyof Category) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    
    try {
      await deleteCategory(categoryToDelete.id)
      onCategoryChange()
    } catch (error) {
      console.error('Error deleting category:', error)
      // Could add error handling here
    } finally {
      setCategoryToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(3).fill(0).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          {categories.length === 0 && (
            <TableCaption>
              <div className="py-4">
                <p className="text-center">No categories found.</p>
                <p className="text-center text-sm text-gray-500 mt-1">
                  Use the "Add Category" button to create a new category.
                </p>
              </div>
            </TableCaption>
          )}
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                Name{getSortIndicator('name')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('spendingType')}
              >
                Type{getSortIndicator('spendingType')}
              </TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.map((category) => (
              <TableRow key={category.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  {category.name}
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                      {category.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <SpendingTypeBadge type={category.spendingType} />
                </TableCell>
                <TableCell>
                  {category.color ? (
                    <div className="flex items-center">
                      <span 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.color}
                    </div>
                  ) : (
                    'Default'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCategoryToDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog 
        open={!!categoryToDelete} 
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 