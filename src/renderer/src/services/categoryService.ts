import { Category, CategoryCreateInput, CategoryUpdateInput } from '../lib/types'

// Format category data received from IPC
function formatCategoryData(category: any): Category {
  return {
    ...category,
    // Ensure dates are Date objects
    createdAt: category.createdAt instanceof Date ? category.createdAt : new Date(category.createdAt),
    updatedAt: category.updatedAt instanceof Date ? category.updatedAt : new Date(category.updatedAt)
  }
}

// Get all categories
export async function getAllCategories(): Promise<Category[]> {
  try {
    const categories = await window.database.categories.getAll()
    return categories.map(formatCategoryData)
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

// Get category by ID
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const category = await window.database.categories.getById(id)
    if (!category) return null
    return formatCategoryData(category)
  } catch (error) {
    console.error(`Error fetching category ${id}:`, error)
    throw error
  }
}

// Create new category
export async function createCategory(data: CategoryCreateInput): Promise<Category> {
  try {
    const category = await window.database.categories.create(data)
    return formatCategoryData(category)
  } catch (error) {
    console.error('Error creating category:', error)
    throw error
  }
}

// Create multiple categories at once
export async function createCategories(data: CategoryCreateInput[]): Promise<Category[]> {
  try {
    // Use existing create method for each category instead of bulk method
    const createdCategories: Category[] = [];
    
    // Process categories one by one
    for (const categoryData of data) {
      const category = await window.database.categories.create(categoryData);
      createdCategories.push(formatCategoryData(category));
    }
    
    return createdCategories;
  } catch (error) {
    console.error('Error creating categories:', error);
    throw error;
  }
}

// Update category
export async function updateCategory(id: string, data: CategoryUpdateInput): Promise<Category> {
  try {
    const category = await window.database.categories.update(id, data)
    return formatCategoryData(category)
  } catch (error) {
    console.error(`Error updating category ${id}:`, error)
    throw error
  }
}

// Delete category
export async function deleteCategory(id: string): Promise<void> {
  try {
    await window.database.categories.delete(id)
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error)
    throw error
  }
} 