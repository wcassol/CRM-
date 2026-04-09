'use client'

import { Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { formatRelative } from '@/lib/utils/format'
import { TemperaturaBadge } from '@/components/leads/TemperaturaBadge'
import { EtapaBadge } from '@/components/leads/EtapaBadge'
import { Skeleton } from '@/components/shared/LoadingSkeleton'

export function RecentLeads() {
  const { data, isLoading } = trpc.dashboard.leadsRecentes.useQuery()

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Leads Recentes (24h)</h2>
        <Link href="/leads" className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !data?.length ? (
        <div className="py-8 text-center">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum lead nas últimas 24h</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center gap-3 py-3 hover:bg-purple-50 -mx-2 px-2 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-purple-700 text-xs font-bold">
                  {lead.nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600">
                  {lead.nome}
                </p>
                <p className="text-xs text-gray-400">{lead.area_juridica ?? 'Área não definida'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <EtapaBadge etapa={lead.etapa_comercial} />
                <span className="text-[10px] text-gray-400">{formatRelative(lead.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
