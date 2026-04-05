'use client'

import { useState, useCallback } from 'react'

export interface Toast {
  id:       string
  title:    string
  variant?: 'default' | 'destructive'
}

let externalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null

export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>([])
  externalSetToasts = setToasts

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, dismiss }
}

export function useToast() {
  const toast = useCallback(({ title, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const newToast: Toast = { id, title, variant }

    if (externalSetToasts) {
      externalSetToasts(prev => [...prev, newToast])
      setTimeout(() => {
        externalSetToasts?.(prev => prev.filter(t => t.id !== id))
      }, 4000)
    } else {
      // Fallback when used outside ToastProvider
      console.warn('[Toast]', title)
    }
  }, [])

  return { toast }
}
