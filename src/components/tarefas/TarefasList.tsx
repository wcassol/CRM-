'use client'

import Link from 'next/link'
import { CheckSquare, Clock, AlertCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { formatDate, formatRelative } from '@/lib/utils/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type FilterMode = 'todas' | 'minhas' | 'vencidas' | 'hoje'

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  urgente: { label: 'Urgente', bg: 'bg-red-100',    text: 'text-red-700' },
  alta:    { label: 'Alta',    bg: 'bg-orange-100',  text: 'text-orange-700' },
  media:   { label: 'Média',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  baixa:   { label: 'Baixa',   bg: 'bg-slate-100',   text: 'text-slate-600' },
}

export function TarefasList({ filter }: { filter: FilterMode }) {
  const { user } = useCurrentUser()
  const utils    = trpc.useUtils()

  const query = trpc.tasks.list.useQuery({
    page:             1,
    per_page:         100,
    responsavel_id:   filter === 'minhas' ? user?.id : undefined,
    apenas_vencidas:  filter === 'vencidas' ? true : undefined,
    status:           filter === 'todas' ? undefined : 'aberta',
  })

  const complete = trpc.tasks.complete.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  })

  const tasks = query.data ?? []

  // Filtro "hoje" no frontend
  const filtered = filter === 'hoje'
    ? tasks.filter(t => t.vencimento && new Date(t.vencimento).toDateString() === new Date().toDateString())
    : tasks

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Nenhuma tarefa encontrada"
        description={
          filter === 'vencidas' ? 'Ótimo! Nenhuma tarefa vencida.' :
          filter === 'hoje'     ? 'Nenhuma tarefa com vencimento hoje.' :
          'Crie tarefas para acompanhar o progresso dos leads.'
        }
      />
    )
  }

  // Agrupar por prioridade para melhor visualização
  const groups = ['urgente', 'alta', 'media', 'baixa'] as const

  return (
    <div className="space-y-6">
      {groups.map(prioridade => {
        const group = filtered.filter(t => t.prioridade === prioridade)
        if (!group.length) return null
        const config = PRIORITY_CONFIG[prioridade]!

        return (
          <div key={prioridade}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.bg, config.text)}>
                {config.label}
              </span>
              <span className="text-xs text-gray-400">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    'bg-white rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm',
                    task.esta_vencida ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => complete.mutate({ id: task.id })}
                    className={cn(
                      'w-5 h-5 rounded border-2 shrink-0 mt-0.5 transition-all hover:border-green-500',
                      task.status === 'concluida'
                        ? 'bg-green-500 border-green-500'
                        : task.esta_vencida ? 'border-red-400' : 'border-gray-300'
                    )}
                    disabled={task.status === 'concluida'}
                  >
                    {task.status === 'concluida' && <span className="text-white text-[10px]">✓</span>}
                  </button>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium text-gray-900',
                      task.status === 'concluida' && 'line-through text-gray-400'
                    )}>
                      {task.titulo}
                    </p>
                    {task.lead_nome && (
                      <Link href={`/leads/${task.lead_id}`} className="text-xs text-blue-600 hover:underline">
                        {task.lead_nome}
                      </Link>
                    )}
                    {task.descricao && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        {task.esta_vencida
                          ? <AlertCircle className="w-3 h-3 text-red-500" />
                          : <Clock className="w-3 h-3 text-gray-400" />
                        }
                        <span className={cn('text-xs', task.esta_vencida ? 'text-red-600 font-medium' : 'text-gray-400')}>
                          {task.vencimento ? formatDate(task.vencimento) : 'Sem prazo'}
                        </span>
                      </div>
                      {task.responsavel_nome && (
                        <span className="text-xs text-gray-400">→ {task.responsavel_nome}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
