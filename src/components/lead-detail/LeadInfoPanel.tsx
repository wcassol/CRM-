'use client'

import { useState } from 'react'
import { Edit2, Check, X, User, Briefcase, Calendar, ExternalLink, Clock } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { DbLead } from '@/types/database.types'

const APPT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  agendada:  { label: 'Agendada',   color: 'text-blue-600 bg-blue-50' },
  reagendada:{ label: 'Reagendada', color: 'text-indigo-600 bg-indigo-50' },
  realizada: { label: 'Realizada',  color: 'text-green-600 bg-green-50' },
  cancelada: { label: 'Cancelada',  color: 'text-red-500 bg-red-50' },
  faltou:    { label: 'Faltou',     color: 'text-orange-500 bg-orange-50' },
}

interface LeadInfoPanelProps {
  lead: DbLead & Record<string, any>
}

export function LeadInfoPanel({ lead }: LeadInfoPanelProps) {
  const utils = trpc.useUtils()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const updateComercial = trpc.leads.updateComercial.useMutation({
    onSuccess: () => {
      utils.leads.byId.invalidate(lead.id)
      setEditing(null)
    },
  })

  const { data: users } = trpc.users.list.useQuery()
  const { data: appointments } = trpc.appointments.byLead.useQuery(lead.id)
  const calcomMeetings = (appointments ?? []).filter((a: any) => a.calcom_uid)

  function startEdit(field: string, value: string) {
    setEditing(field)
    setEditValue(value ?? '')
  }

  function saveEdit(field: string) {
    updateComercial.mutate({
      id: lead.id,
      [field]: editValue || null,
    })
  }

  return (
    <div className="space-y-4">

      {/* Reuniões Cal.com */}
      {calcomMeetings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Reuniões (Cal.com)
          </h3>
          <div className="space-y-3">
            {calcomMeetings.map((appt: any) => {
              const s = APPT_STATUS_LABEL[appt.status] ?? { label: appt.status, color: 'text-gray-500 bg-gray-50' }
              return (
                <div key={appt.id} className="border border-gray-100 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 leading-snug flex-1">{appt.titulo}</p>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', s.color)}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(appt.data_hora).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {appt.duracao_min && <span className="ml-1">· {appt.duracao_min} min</span>}
                  </div>
                  {appt.link_meet && (
                    <a
                      href={appt.link_meet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Entrar na reunião
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Responsáveis */}
      <InfoCard title="Responsáveis" icon={User}>
        <InfoRow label="Comercial"
          value={(lead.responsavel_comercial as any)?.full_name ?? 'Não atribuído'} />
        <InfoRow label="Jurídico"
          value={(lead.responsavel_juridico as any)?.full_name ?? 'Não atribuído'} />
      </InfoCard>

      {/* Dados do Caso */}
      <InfoCard title="Caso" icon={Briefcase}>
        <InfoRow label="Área"         value={lead.area_juridica}  capitalize />
        <InfoRow label="Subtipo"      value={lead.subtipo_caso} />
        <InfoRow label="Parte contrária" value={lead.parte_contraria} />
        {lead.data_fato && <InfoRow label="Data do fato" value={formatDate(lead.data_fato)} />}
        <InfoRow label="Urgência"     value={lead.urgencia}       capitalize />
        {lead.tentou_resolver_antes && <InfoRow label="Tentou resolver" value="Sim" />}
        {lead.ja_tem_advogado       && <InfoRow label="Tem advogado"    value="Sim" />}
        {lead.prazo_sensivel        && <InfoRow label="Prazo sensível"  value="⚠ Sim" />}
      </InfoCard>

      {/* Comercial */}
      <InfoCard title="Comercial">
        {lead.viabilidade_preliminar && (
          <InfoRow label="Viabilidade" value={lead.viabilidade_preliminar} capitalize />
        )}
        {lead.chance_fechamento_pct != null && (
          <InfoRow label="Chance" value={`${lead.chance_fechamento_pct}%`} />
        )}
        {lead.valor_proposto && (
          <InfoRow label="Valor proposto" value={formatCurrency(lead.valor_proposto)} />
        )}
        {lead.objecao_principal && (
          <InfoRow label="Objeção" value={lead.objecao_principal} />
        )}
      </InfoCard>

      {/* Origem */}
      <InfoCard title="Origem">
        <InfoRow label="Canal"    value={(lead.source as any)?.nome} />
        <InfoRow label="Campanha" value={lead.campanha} />
        {lead.utm_source   && <InfoRow label="utm_source"   value={lead.utm_source} />}
        {lead.utm_medium   && <InfoRow label="utm_medium"   value={lead.utm_medium} />}
        {lead.utm_campaign && <InfoRow label="utm_campaign" value={lead.utm_campaign} />}
      </InfoCard>

      {/* Astrea */}
      {lead.referencia_astrea && (
        <InfoCard title="Astrea">
          <InfoRow label="Referência" value={lead.referencia_astrea} />
          {lead.data_envio_astrea && (
            <InfoRow label="Enviado em" value={formatDate(lead.data_envio_astrea)} />
          )}
        </InfoCard>
      )}
    </div>
  )
}

function InfoCard({ title, icon: Icon, children }: {
  title: string; icon?: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, capitalize }: {
  label: string; value: string | null | undefined; capitalize?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={cn('text-xs text-gray-700 font-medium text-right', capitalize && 'capitalize')}>
        {value}
      </span>
    </div>
  )
}
