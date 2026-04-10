'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { trpc } from '@/lib/trpc/client'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { KanbanSkeleton } from '@/components/shared/LoadingSkeleton'
import { ETAPAS_COMERCIAL_ORDENADAS } from '@/lib/constants/pipeline-stages'
import { useToast } from '@/hooks/useToast'
import type { EtapaComercial } from '@/types/database.types'

interface LeadKanbanProps {
  filters?: Record<string, string>
}

export function LeadKanban({ filters }: LeadKanbanProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: leads, isLoading } = trpc.leads.kanban.useQuery({
    pipeline: 'comercial',
    ...filters,
  })

  const moveStage = trpc.leads.moveStage.useMutation({
    onSuccess: () => {
      utils.leads.kanban.invalidate()
      utils.dashboard.metrics.invalidate()
    },
    onError: (err) => toast({ title: err.message, variant: 'destructive' }),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  if (isLoading) return <KanbanSkeleton />

  const leadMap = ETAPAS_COMERCIAL_ORDENADAS.reduce((acc, stage) => {
    acc[stage.id] = (leads ?? []).filter(l => l.etapa_comercial === stage.id)
    return acc
  }, {} as Record<string, typeof leads>)

  const activeCard = activeId ? (leads ?? []).find(l => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const leadId  = active.id as string
    const lead    = (leads ?? []).find(l => l.id === leadId)
    if (!lead) return

    // over.id pode ser o ID da coluna (stage.id) ou o ID de outro card (lead UUID)
    // quando o card é solto perto de outro card, o dnd-kit retorna o ID do card alvo
    const stageIds = new Set(ETAPAS_COMERCIAL_ORDENADAS.map(s => s.id))
    let etapaNova: EtapaComercial

    if (stageIds.has(over.id as string)) {
      etapaNova = over.id as EtapaComercial
    } else {
      // Dropped near another card — resolve target stage from that card
      const targetLead = (leads ?? []).find(l => l.id === over.id)
      if (!targetLead) return
      etapaNova = targetLead.etapa_comercial as EtapaComercial
    }

    if (lead.etapa_comercial === etapaNova) return

    // Perdas requerem fluxo com modal — não permitir drag direto para perdas
    if (['perdas'].includes(etapaNova as string)) {
      toast({ title: 'Use o menu do card para marcar como perdido.', variant: 'default' })
      return
    }

    moveStage.mutate({
      lead_id:    leadId,
      pipeline:   'comercial',
      etapa_nova: etapaNova,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {ETAPAS_COMERCIAL_ORDENADAS.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadMap[stage.id] ?? []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="drag-overlay">
            <KanbanCard lead={activeCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
