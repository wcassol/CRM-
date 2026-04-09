'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, LayoutGrid, List, Filter } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { LeadKanban } from '@/components/leads/LeadKanban'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadCreateModal } from '@/components/leads/LeadCreateModal'
import { cn } from '@/lib/utils/cn'
import { usePermission } from '@/hooks/usePermission'

type ViewMode = 'kanban' | 'table'

export default function LeadsPage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const canCreate   = usePermission('leads', 'criar')

  const [view,          setView]          = useState<ViewMode>('kanban')
  const [showFilters,   setShowFilters]   = useState(false)
  const [showCreate,    setShowCreate]    = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    search: params.get('search') ?? '',
  })

  const filterCount = Object.values(activeFilters).filter(Boolean).length

  return (
    <>
      <Topbar title="Leads">
        {/* View toggle */}
        <div className="flex items-center bg-purple-50 rounded-xl p-0.5 border border-purple-100">
          <button
            onClick={() => setView('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              view === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              view === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="w-4 h-4" />
            Tabela
          </button>
        </div>

        {/* Filtros */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            showFilters || filterCount > 0
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-purple-50'
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {filterCount > 0 && (
            <span className="w-4 h-4 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>

        {/* Novo lead */}
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-[0_4px_12px_rgba(139,92,246,0.35)]"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        )}
      </Topbar>

      {/* Filtros expandidos */}
      {showFilters && (
        <div className="px-6 py-3 bg-white/80 border-b border-purple-100 backdrop-blur-sm">
          <LeadFilters
            values={activeFilters}
            onChange={setActiveFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Conteúdo */}
      <main className={cn(
        'flex-1 overflow-auto',
        view === 'kanban' ? 'p-6' : 'p-0'
      )}>
        {view === 'kanban'
          ? <LeadKanban filters={activeFilters} />
          : <LeadTable  filters={activeFilters} />
        }
      </main>

      {/* Modal criar lead */}
      <LeadCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(id) => router.push(`/leads/${id}`)}
      />
    </>
  )
}
