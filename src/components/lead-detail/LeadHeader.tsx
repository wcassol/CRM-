'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Calendar, MoreHorizontal, XCircle, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { EtapaBadge } from '@/components/leads/EtapaBadge'
import { TemperaturaBadge } from '@/components/leads/TemperaturaBadge'
import { formatPhone, formatCurrency } from '@/lib/utils/format'
import { ETAPAS_COMERCIAL_ORDENADAS, ETAPAS_PODEM_PERDER } from '@/lib/constants/pipeline-stages'
import { cn } from '@/lib/utils/cn'
import { useToast } from '@/hooks/useToast'
import type { DbLead } from '@/types/database.types'

interface LeadHeaderProps {
  lead: DbLead & Record<string, any>
}

export function LeadHeader({ lead }: LeadHeaderProps) {
  const { toast } = useToast()
  const utils  = trpc.useUtils()
  const [showStages, setShowStages] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const moveStage = trpc.leads.moveStage.useMutation({
    onSuccess: () => {
      utils.leads.byId.invalidate(lead.id)
      utils.leads.kanban.invalidate()
      setShowStages(false)
      toast({ title: 'Etapa atualizada' })
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const canMoveToLoss = ETAPAS_PODEM_PERDER.includes(lead.etapa_comercial)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Info principal */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-700 text-lg font-bold">
              {lead.nome.charAt(0).toUpperCase()}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{lead.nome}</h1>
              {lead.urgencia === 'critica' && (
                <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                  URGENTE
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <TemperaturaBadge temperatura={lead.temperatura} />
              <EtapaBadge etapa={lead.etapa_comercial} />
              {lead.area_juridica && (
                <span className="text-xs text-gray-400 capitalize">{lead.area_juridica}</span>
              )}
            </div>

            {/* Contatos */}
            <div className="flex items-center gap-4 mt-2">
              <a href={`tel:${lead.telefone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Phone className="w-3.5 h-3.5" />
                {formatPhone(lead.telefone)}
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                  {lead.email}
                </a>
              )}
              {lead.cidade && (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {lead.cidade}{lead.estado ? `, ${lead.estado}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {lead.ticket_fechado && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Ticket</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(lead.ticket_fechado)}</p>
            </div>
          )}

          {/* Mover etapa */}
          <div className="relative">
            <button
              onClick={() => setShowStages(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mover etapa
              <ChevronRight className={cn('w-4 h-4 transition-transform', showStages && 'rotate-90')} />
            </button>
            {showStages && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStages(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1 max-h-72 overflow-y-auto">
                  {ETAPAS_COMERCIAL_ORDENADAS.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => moveStage.mutate({ lead_id: lead.id, pipeline: 'comercial', etapa_nova: stage.id })}
                      disabled={stage.id === lead.etapa_comercial || moveStage.isPending}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors',
                        stage.id === lead.etapa_comercial
                          ? 'text-blue-600 font-semibold bg-blue-50 cursor-default'
                          : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                      )}
                    >
                      {stage.id === lead.etapa_comercial && '✓ '}
                      {stage.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(v => !v)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Agendar reunião
                  </button>
                  {canMoveToLoss && (
                    <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Marcar como perdido
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Próxima ação */}
      {lead.proxima_acao && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm text-gray-600">
            <span className="font-medium">Próxima ação:</span> {lead.proxima_acao}
            {lead.data_proxima_acao && (
              <span className="text-gray-400 ml-1">
                — {new Date(lead.data_proxima_acao).toLocaleDateString('pt-BR')}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
