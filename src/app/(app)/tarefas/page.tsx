'use client'

import { useState } from 'react'
import { Plus, Filter, CheckSquare } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { TarefasList } from '@/components/tarefas/TarefasList'
import { TarefaCreateModal } from '@/components/tarefas/TarefaCreateModal'
import { cn } from '@/lib/utils/cn'

type FilterMode = 'todas' | 'minhas' | 'vencidas' | 'hoje'

export default function TarefasPage() {
  const params      = useSearchParams()
  const initFilter  = (params.get('filter') as FilterMode) ?? 'minhas'
  const [filter,    setFilter]    = useState<FilterMode>(initFilter)
  const [showCreate, setShowCreate] = useState(false)

  const FILTERS: Array<{ id: FilterMode; label: string; danger?: boolean }> = [
    { id: 'minhas',  label: 'Minhas tarefas' },
    { id: 'vencidas', label: 'Vencidas',       danger: true },
    { id: 'hoje',    label: 'Vencem hoje' },
    { id: 'todas',   label: 'Todas' },
  ]

  return (
    <>
      <Topbar title="Tarefas">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </Topbar>

      <main className="flex-1 overflow-y-auto">
        {/* Filter bar */}
        <div className="px-6 pt-4 pb-0 flex items-center gap-2 border-b border-gray-100 bg-white sticky top-0 z-10">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                filter === f.id
                  ? f.danger
                    ? 'border-red-500 text-red-600'
                    : 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <TarefasList filter={filter} />
        </div>
      </main>

      <TarefaCreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
