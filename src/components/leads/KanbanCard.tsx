'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, FileText, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils/format'
import { TemperaturaBadge } from './TemperaturaBadge'

interface KanbanCardProps {
  lead: any
  isDragOverlay?: boolean
}

export function KanbanCard({ lead, isDragOverlay }: KanbanCardProps) {
  const router = useRouter()
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasOverdueTasks    = lead.tarefas_vencidas > 0
  const hasPendingDocs     = lead.documentos_pendentes > 0
  const hasUrgency         = lead.urgencia === 'alta' || lead.urgencia === 'critica' || lead.prazo_sensivel

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-3 cursor-grab group',
        'hover:shadow-md hover:border-blue-200 transition-all',
        isDragging && 'opacity-40 cursor-grabbing',
        isDragOverlay && 'shadow-xl border-blue-300 cursor-grabbing',
        hasOverdueTasks && 'border-l-4 border-l-red-400',
      )}
      onClick={() => !isDragging && router.push(`/leads/${lead.id}`)}
    >
      {/* Lead name + temperature */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.nome}</p>
        </div>
        <TemperaturaBadge temperatura={lead.temperatura} />
      </div>

      {/* Área + telefone */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="truncate">{lead.area_juridica ?? 'Área não definida'}</span>
        <span className="shrink-0 ml-1">{formatPhone(lead.telefone)}</span>
      </div>

      {/* Valor proposto */}
      {lead.valor_proposto && (
        <p className="text-xs font-semibold text-green-700 mb-2">
          {formatCurrency(lead.valor_proposto)}
        </p>
      )}

      {/* Responsável + alertas */}
      <div className="flex items-center justify-between gap-1 mt-1">
        {lead.responsavel_comercial_nome ? (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
              {lead.responsavel_comercial_avatar ? (
                <img src={lead.responsavel_comercial_avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-slate-600">
                  {lead.responsavel_comercial_nome.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
              {lead.responsavel_comercial_nome.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-amber-500 font-medium">Sem responsável</span>
        )}

        {/* Ícones de alerta */}
        <div className="flex items-center gap-1">
          {hasOverdueTasks && (
            <span title="Tarefas vencidas">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            </span>
          )}
          {hasPendingDocs && (
            <span title="Documentos pendentes">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
            </span>
          )}
          {lead.data_proxima_acao && (
            <span title={`Próxima ação: ${formatDate(lead.data_proxima_acao)}`}>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </span>
          )}
          {hasUrgency && (
            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded">
              {lead.urgencia === 'critica' ? 'URGENTE' : '!'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
