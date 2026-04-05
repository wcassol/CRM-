'use client'

import { Bell, Check } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, total, markRead, markAllRead } = useNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-900">
                Notificações {total > 0 && <span className="text-gray-400">({total})</span>}
              </span>
              {total > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhuma notificação nova
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.titulo}</p>
                        {n.mensagem && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
