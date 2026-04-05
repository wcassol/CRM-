'use client'

import { useToastStore } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start justify-between gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border animate-in slide-in-from-right-4 fade-in',
            t.variant === 'destructive'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-white text-gray-900 border-gray-100'
          )}
        >
          <span>{t.title}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
