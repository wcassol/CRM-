'use client'

import { Calendar, Video, AlertCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { formatDateLabel } from '@/lib/utils/format'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

export function AppointmentsWidget() {
  const { data, isLoading } = trpc.dashboard.proximasReunioes.useQuery()

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Próximas Reuniões</h2>
        <span className="text-xs text-gray-400">7 dias</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !data?.length ? (
        <div className="py-8 text-center">
          <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhuma reunião agendada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((appt) => (
            <Link
              key={appt.id}
              href={`/leads/${appt.lead_id}`}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors group',
                appt.e_hoje && 'bg-purple-50 hover:bg-purple-100'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                appt.e_hoje ? 'bg-purple-100' : 'bg-gray-100'
              )}>
                <Calendar className={cn('w-4 h-4', appt.e_hoje ? 'text-purple-600' : 'text-gray-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600">
                  {appt.cliente_nome}
                </p>
                <p className="text-xs text-gray-500">{formatDateLabel(appt.data_hora)}</p>
                {appt.passou_sem_resultado && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] text-amber-600 font-medium">Aguardando resultado</span>
                  </div>
                )}
              </div>
              {appt.link_meet && (
                <a
                  href={appt.link_meet}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-purple-500 hover:text-purple-700 shrink-0 p-1"
                >
                  <Video className="w-4 h-4" />
                </a>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
