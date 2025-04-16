import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import { Keyboard } from 'lucide-react'

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const { shortcuts } = useKeyboardNavigation()

  const formatShortcut = (shortcut: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => {
    const parts: string[] = []
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.altKey) parts.push('Alt')
    if (shortcut.shiftKey) parts.push('Shift')
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key)
    return parts.join(' + ')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and categorize transactions quickly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              ←
            </kbd>
            <span className="text-sm">Previous transaction</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              →
            </kbd>
            <span className="text-sm">Next transaction</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              1-9
            </kbd>
            <span className="text-sm">Select category by number</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              Space
            </kbd>
            <span className="text-sm">Request AI suggestions</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <div className="flex gap-1">
              <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                Ctrl
              </kbd>
              <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                S
              </kbd>
            </div>
            <span className="text-sm">Save changes</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              Esc
            </kbd>
            <span className="text-sm">Exit wizard</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 