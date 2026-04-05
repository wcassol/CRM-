'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils/cn'
import { KanbanCard } from './KanbanCard'
import type { StageConfig } from '@/lib/constants/pipeline-stages'
import { formatCurrency } from '@/lib/utils/format'

interface KanbanColumnProps {
  stage:  StageConfig
  leads:  any[]
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const valorTotal = leads.reduce((acc, l) => acc + (l.valor_proposto ?? 0), 0)

  return (
    <div className="kanban-column">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg mb-2 border',
        stage.cor, stage.corBorda
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold', stage.corTexto)}>{stage.label}</span>
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            stage.corTexto, 'bg-white/60'
          )}>
            {leads.length}
          </span>
        </div>
        {valorTotal > 0 && (
          <span className={cn('text-[10px] font-medium', stage.corTexto)}>
            {formatCurrency(valorTotal)}
          </span>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[120px] space-y-2 rounded-xl p-1 transition-colors',
          isOver && 'bg-blue-50 ring-2 ring-blue-300 ring-dashed'
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className={cn(
            'flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs',
            isOver ? 'border-blue-300 text-blue-400' : 'border-gray-200 text-gray-300'
          )}>
            {isOver ? 'Soltar aqui' : 'Vazio'}
          </div>
        )}
      </div>
    </div>
  )
}
