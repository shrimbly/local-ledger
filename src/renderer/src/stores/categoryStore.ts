import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { 
  Category, 
  CategoryCreateInput, 
  CategoryUpdateInput 
} from '../lib/types'
import { 
  getAllCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../services/categoryService'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  selectedCategoryId: string | null
  
  // Actions
  fetchCategories: () => Promise<void>
  addCategory: (category: CategoryCreateInput) => Promise<void>
  updateCategory: (id: string, data: CategoryUpdateInput) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  selectCategory: (id: string | null) => void
  
  // Selectors
  getCategoryById: (id: string) => Category | undefined
  getCategoryByName: (name: string) => Category | undefined
  getCategoryColor: (id: string | null | undefined) => string
  getCategoriesForSelection: () => { label: string, value: string, color?: string }[]
  getSortedCategories: () => Category[]
}

// Default category color for uncategorized items
const DEFAULT_CATEGORY_COLOR = '#94a3b8'

export const useCategoryStore = create<CategoryState>()(
  devtools(
    persist(
      (set, get) => ({
        categories: [],
        isLoading: false,
        error: null,
        selectedCategoryId: null,
        
        // Fetch all categories
        fetchCategories: async () => {
          set({ isLoading: true, error: null })
          try {
            const data = await getAllCategories()
            set({
              categories: data,
              isLoading: false
            })
          } catch (err) {
            console.error('Error fetching categories:', err)
            set({
              error: 'Failed to fetch categories',
              isLoading: false
            })
          }
        },
        
        // Add a new category
        addCategory: async (category) => {
          set({ isLoading: true, error: null })
          try {
            await createCategory(category)
            await get().fetchCategories()
          } catch (err) {
            console.error('Error adding category:', err)
            set({
              error: 'Failed to add category',
              isLoading: false
            })
          }
        },
        
        // Update an existing category
        updateCategory: async (id, data) => {
          set({ isLoading: true, error: null })
          try {
            await updateCategory(id, data)
            await get().fetchCategories()
          } catch (err) {
            console.error('Error updating category:', err)
            set({
              error: 'Failed to update category',
              isLoading: false
            })
          }
        },
        
        // Delete a category
        removeCategory: async (id) => {
          set({ isLoading: true, error: null })
          try {
            await deleteCategory(id)
            await get().fetchCategories()
          } catch (err) {
            console.error('Error deleting category:', err)
            set({
              error: 'Failed to delete category',
              isLoading: false
            })
          }
        },
        
        // Select a category
        selectCategory: (id) => {
          set({ selectedCategoryId: id })
        },
        
        // Get a category by ID
        getCategoryById: (id) => {
          return get().categories.find(category => category.id === id)
        },
        
        // Get a category by name
        getCategoryByName: (name) => {
          return get().categories.find(
            category => category.name.toLowerCase() === name.toLowerCase()
          )
        },
        
        // Get color for a category, with fallback for null/undefined
        getCategoryColor: (id) => {
          if (!id) return DEFAULT_CATEGORY_COLOR
          const category = get().getCategoryById(id)
          return category?.color || DEFAULT_CATEGORY_COLOR
        },
        
        // Get categories formatted for selection components
        getCategoriesForSelection: () => {
          return [
            { label: 'Uncategorized', value: 'no-category', color: DEFAULT_CATEGORY_COLOR },
            ...get().categories.map(category => ({
              label: category.name,
              value: category.id,
              color: category.color || DEFAULT_CATEGORY_COLOR
            }))
          ]
        },
        
        // Get categories sorted alphabetically
        getSortedCategories: () => {
          return [...get().categories].sort((a, b) => a.name.localeCompare(b.name))
        }
      }),
      {
        name: 'category-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist the selected category ID
          selectedCategoryId: state.selectedCategoryId
        }),
        version: 1
      }
    ),
    { name: 'CategoryStore' }
  )
)

// Create optimized selector hooks for better performance
export const useCategorySelectors = () => {
  const categories = useCategoryStore(state => state.categories)
  const isLoading = useCategoryStore(state => state.isLoading)
  const error = useCategoryStore(state => state.error)
  const selectedCategoryId = useCategoryStore(state => state.selectedCategoryId)
  
  // Use shallow comparison for derived data
  const categoryOptions = useCategoryStore(useShallow(state => 
    state.getCategoriesForSelection()
  ))
  
  const categoryCount = useCategoryStore(state => state.categories.length)
  
  return {
    categories,
    isLoading,
    error,
    selectedCategoryId,
    categoryOptions,
    categoryCount
  }
} 