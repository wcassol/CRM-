'use client'

import { Bell, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { UserMenu } from './UserMenu'
import { NotificationBell } from './NotificationBell'

interface TopbarProps {
  title?:    string
  children?: React.ReactNode
}

export function Topbar({ title, children }: TopbarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/leads?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-6 shrink-0">
      {/* Title */}
      {title && (
        <h1 className="text-lg font-semibold text-gray-900 shrink-0">{title}</h1>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lead por nome, telefone, e-mail..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
          />
        </div>
      </form>

      {/* Actions slot */}
      {children && <div className="flex items-center gap-2">{children}</div>}

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
