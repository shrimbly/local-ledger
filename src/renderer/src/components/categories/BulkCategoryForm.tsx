import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { createCategories } from '../../services/categoryService';
import { CategoryCreateInput } from '../../lib/types';
import { X } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';

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

interface BulkCategoryFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function BulkCategoryForm({ onComplete, onCancel }: BulkCategoryFormProps) {
  const [categoryText, setCategoryText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CategoryCreateInput[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Get a random color from the palette
  const getRandomColor = (): string => {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  };

  const parseCategories = (): CategoryCreateInput[] => {
    const lines = categoryText.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      const parts = line.split(',');
      const name = parts[0].trim();
      // Use color from input or get a random one from the palette
      const color = parts.length > 1 && parts[1].trim() ? parts[1].trim() : getRandomColor();
      
      return { name, color };
    });
  };

  const handlePreview = () => {
    try {
      if (categoryText.trim() === '') {
        setError('Please enter at least one category');
        return;
      }
      
      const parsedCategories = parseCategories();
      
      if (parsedCategories.some(cat => cat.name === '')) {
        setError('All categories must have a name');
        return;
      }
      
      setPreview(parsedCategories);
      setIsPreviewMode(true);
      setError(null);
    } catch (err) {
      console.error('Error parsing categories:', err);
      setError('Failed to parse categories. Please check format.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await createCategories(preview);
      onComplete();
    } catch (err) {
      console.error('Error saving categories:', err);
      setError('Failed to save categories. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBackToEdit = () => {
    setIsPreviewMode(false);
  };

  return (
    <div className="space-y-4">
      {!isPreviewMode ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="categories">Enter Categories</Label>
            <div className="text-sm text-gray-500 mb-2">
              Enter one category per line. Optionally add a color hex code after a comma.
              <br />
              Example: Groceries,#4CAF50
              <br />
              Leave the color blank to get a random color from our palette.
            </div>
            <Textarea
              id="categories"
              value={categoryText}
              onChange={(e) => setCategoryText(e.target.value)}
              placeholder="Groceries,#4CAF50
Dining Out
Utilities
Entertainment,#9C27B0"
              className="min-h-[200px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Available colors:</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center"
                  title={color}
                >
                  <div 
                    className="w-6 h-6 rounded-full cursor-pointer" 
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      const textarea = document.getElementById('categories') as HTMLTextAreaElement;
                      if (textarea) {
                        const cursorPos = textarea.selectionStart;
                        const textBefore = categoryText.substring(0, cursorPos);
                        const textAfter = categoryText.substring(cursorPos);
                        const newValue = `${textBefore}${color}${textAfter}`;
                        setCategoryText(newValue);
                        // Set focus back with cursor at the right position
                        setTimeout(() => {
                          textarea.focus();
                          textarea.selectionStart = cursorPos + color.length;
                          textarea.selectionEnd = cursorPos + color.length;
                        }, 0);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="font-medium">Preview ({preview.length} categories):</h3>
            <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto">
              {preview.map((category, index) => (
                <div key={index} className="flex items-center space-x-2 py-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                  <span className="text-xs text-gray-500">{category.color}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
        
        {isPreviewMode ? (
          <>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleBackToEdit}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || preview.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Create Categories'}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handlePreview} 
            disabled={isSubmitting || categoryText.trim() === ''}
          >
            Preview Categories
          </Button>
        )}
      </div>
    </div>
  );
} 