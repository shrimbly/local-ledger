import { 
  CategorizationRule, 
  CategorizationRuleCreateInput, 
  CategorizationRuleUpdateInput,
  Transaction 
} from '../lib/types';

// Get all categorization rules
export async function getAllCategorizationRules(): Promise<CategorizationRule[]> {
  try {
    console.log('Fetching all categorization rules via IPC...')
    const rules = await (window.database as any).categorizationRules.getAll()
    console.log('Received categorization rules:', rules ? rules.length : 'none')
    return rules || []
  } catch (error) {
    console.error('Error fetching categorization rules:', error)
    throw error
  }
}

// Get categorization rule by ID
export async function getCategorizationRuleById(id: string): Promise<CategorizationRule | null> {
  try {
    const rule = await (window.database as any).categorizationRules.getById(id)
    return rule || null
  } catch (error) {
    console.error(`Error fetching categorization rule ${id}:`, error)
    throw error
  }
}

// Get rules by category ID
export async function getCategorizationRulesByCategory(categoryId: string): Promise<CategorizationRule[]> {
  try {
    const rules = await (window.database as any).categorizationRules.getByCategory(categoryId)
    return rules || []
  } catch (error) {
    console.error(`Error fetching categorization rules for category ${categoryId}:`, error)
    throw error
  }
}

// Create new categorization rule
export async function createCategorizationRule(data: CategorizationRuleCreateInput): Promise<CategorizationRule> {
  try {
    const rule = await (window.database as any).categorizationRules.create(data)
    return rule
  } catch (error) {
    console.error('Error creating categorization rule:', error)
    throw error
  }
}

// Update categorization rule
export async function updateCategorizationRule(id: string, data: CategorizationRuleUpdateInput): Promise<CategorizationRule> {
  try {
    const rule = await (window.database as any).categorizationRules.update(id, data)
    return rule
  } catch (error) {
    console.error(`Error updating categorization rule ${id}:`, error)
    throw error
  }
}

// Delete categorization rule
export async function deleteCategorizationRule(id: string): Promise<void> {
  try {
    await (window.database as any).categorizationRules.delete(id)
  } catch (error) {
    console.error(`Error deleting categorization rule ${id}:`, error)
    throw error
  }
}

// Apply rules to a transaction to find a matching category
export async function applyCategoryRules(transaction: Transaction): Promise<string | null> {
  try {
    const categoryId = await (window.database as any).categorizationRules.apply(transaction)
    return categoryId || null
  } catch (error) {
    console.error('Error applying categorization rules:', error)
    return null
  }
}

// Create a suggested rule based on a transaction's description and category
export function createRuleSuggestionFromTransaction(
  transaction: Transaction, 
  categoryId: string
): CategorizationRuleCreateInput | null {
  if (!transaction.description || !categoryId) {
    return null
  }

  // Create a rule suggestion
  // Extract the first 3-5 words from the description, or a keyword that seems significant
  const words = transaction.description.split(/\s+/);
  let pattern = '';

  if (words.length <= 3) {
    // If the description is short, use the whole description
    pattern = transaction.description;
  } else {
    // For longer descriptions, try to find a significant portion
    // This is a simplified approach - could be made more sophisticated
    
    // Option 1: Try to find a business name at the beginning (common in transactions)
    const potentialBusinessName = words.slice(0, 2).join(' ');
    
    // Option 2: Use first 3 words
    const firstThreeWords = words.slice(0, 3).join(' ');
    
    // For now, go with the shorter option
    pattern = potentialBusinessName.length < firstThreeWords.length ? 
              potentialBusinessName : 
              firstThreeWords;
  }

  return {
    pattern,
    isRegex: false,
    description: `Auto-generated rule for "${transaction.description}"`,
    priority: 0,
    isEnabled: true,
    categoryId
  };
} 