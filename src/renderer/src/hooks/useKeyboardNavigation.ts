import { useEffect, useRef, useCallback } from 'react'
import { useWizardActions } from './useWizardActions'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  action: () => void
}

export function useKeyboardNavigation() {
  const {
    nextTransaction,
    previousTransaction,
    saveCategories,
    currentTransaction
  } = useWizardActions()

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ArrowRight',
      description: 'Next transaction',
      action: () => nextTransaction()
    },
    {
      key: 'ArrowLeft',
      description: 'Previous transaction',
      action: () => previousTransaction()
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Save changes',
      action: () => saveCategories()
    },
    {
      key: '/',
      ctrlKey: true,
      description: 'Open category search',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('#category-search')
        searchInput?.focus()
      }
    },
    {
      key: 'Escape',
      description: 'Close dialogs or clear focus',
      action: () => {
        // This will be handled by individual components
      }
    }
  ]

  // Track focused element
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const shortcut = shortcuts.find(
      (s) =>
        s.key === event.key &&
        !!s.ctrlKey === event.ctrlKey &&
        !!s.shiftKey === event.shiftKey &&
        !!s.altKey === event.altKey
    )

    if (shortcut) {
      event.preventDefault()
      shortcut.action()
    }
  }, [shortcuts])

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Track focus changes
  const handleFocusIn = useCallback((event: FocusEvent) => {
    if (event.target instanceof HTMLElement) {
      lastFocusedRef.current = event.target
    }
  }, [])

  useEffect(() => {
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [handleFocusIn])

  // Restore focus when transaction changes
  useEffect(() => {
    if (currentTransaction && lastFocusedRef.current) {
      lastFocusedRef.current.focus()
    }
  }, [currentTransaction])

  return {
    shortcuts,
    lastFocused: lastFocusedRef.current
  }
} 