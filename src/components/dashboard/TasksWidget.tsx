'use client'

import { CheckSquare, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { formatDate } from '@/lib/utils/format'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { cn } from '@/lib/utils/cn'

const PRIORITY_COLOR: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  media:   'bg-amber-100 text-amber-700',
  baixa:   'bg-slate-100 text-slate-600',
}

export function TasksWidget() {
  const { data, isLoading } = trpc.dashboard.tarefasVencidas.useQuery()
  const complete = trpc.tasks.complete.useMutation({
    onSuccess: () => utils.dashboard.tarefasVencidas.invalidate(),
  })
  const utils = trpc.useUtils()

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Tarefas Vencidas</h2>
          {(data?.length ?? 0) > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {data!.length}
            </span>
          )}
        </div>
        <Link href="/tarefas" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
          Ver todas
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !data?.length ? (
        <div className="py-8 text-center">
          <CheckSquare className="w-8 h-8 text-green-200 mx-auto mb-2" />
          <p className="text-sm text-green-600 font-medium">Nenhuma tarefa vencida</p>
          <p className="text-xs text-gray-400">Tudo em dia!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <button
                onClick={() => complete.mutate({ id: task.id })}
                className="w-5 h-5 rounded border-2 border-red-300 hover:border-green-500 hover:bg-green-50 shrink-0 mt-0.5 transition-colors"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.titulo}</p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', PRIORITY_COLOR[task.prioridade])}>
                    {task.prioridade}
                  </span>
                </div>
                {task.lead_nome && (
                  <Link href={`/leads/${task.lead_id}`} className="text-xs text-purple-600 hover:underline truncate block">
                    {task.lead_nome}
                  </Link>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] text-red-600 font-medium">
                    Venceu em {task.vencimento ? formatDate(task.vencimento) : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
