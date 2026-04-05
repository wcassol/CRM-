'use client'

import { useState } from 'react'
import { Send, Loader2, MessageSquare, Phone, Mail, GitMerge, CheckSquare } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { formatRelative, formatDateTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { initials } from '@/lib/utils/format'

const TIPO_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  nota:        { icon: MessageSquare, color: 'text-gray-500' },
  whatsapp:    { icon: MessageSquare, color: 'text-green-500' },
  ligacao:     { icon: Phone,         color: 'text-blue-500' },
  email:       { icon: Mail,          color: 'text-purple-500' },
  sistema:     { icon: GitMerge,      color: 'text-slate-400' },
  stage_change:{ icon: GitMerge,      color: 'text-indigo-500' },
  task_completed:{ icon: CheckSquare, color: 'text-green-500' },
}

interface LeadTimelineProps {
  leadId: string
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const [nota, setNota] = useState('')
  const [tipo, setTipo] = useState<'nota' | 'ligacao' | 'email' | 'whatsapp'>('nota')
  const utils = trpc.useUtils()

  const { data: interactions, isLoading } = trpc.interactions.list.useQuery({
    lead_id: leadId, limit: 50
  })

  const createInteraction = trpc.interactions.create.useMutation({
    onSuccess: () => {
      setNota('')
      utils.interactions.list.invalidate({ lead_id: leadId })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nota.trim()) return
    createInteraction.mutate({ lead_id: leadId, tipo, conteudo: nota.trim() })
  }

  return (
    <div className="space-y-4">
      {/* Adicionar nota */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 mb-2">
            {(['nota', 'ligacao', 'email', 'whatsapp'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors capitalize',
                  tipo === t
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(e) }}
              rows={2}
              placeholder={
                tipo === 'nota'     ? 'Adicionar uma nota...' :
                tipo === 'ligacao'  ? 'Resumo da ligação...' :
                tipo === 'email'    ? 'Resumo do e-mail...' :
                'Resumo do WhatsApp...'
              }
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <button
              type="submit"
              disabled={!nota.trim() || createInteraction.isPending}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors self-end"
            >
              {createInteraction.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">⌘+Enter para enviar</p>
        </form>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-12 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : !interactions?.length ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhuma interação registrada ainda.
          </div>
        ) : (
          interactions.map((item) => {
            const config = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.nota
            const Icon   = config.icon
            const autor  = (item as any).usuario

            return (
              <div key={item.id} className="flex gap-3">
                {/* Avatar / ícone */}
                <div className="shrink-0">
                  {autor ? (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {autor.avatar_url
                        ? <img src={autor.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : initials(autor.full_name)
                      }
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {autor?.full_name ?? 'Sistema'}
                    </span>
                    <span className={cn('text-[10px] font-medium uppercase', config.color)}>
                      {item.tipo}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                      {formatRelative(item.created_at)}
                    </span>
                  </div>
                  <div className={cn(
                    'text-sm text-gray-700 bg-white border border-gray-100 rounded-xl px-3 py-2',
                    item.tipo === 'sistema' && 'bg-gray-50 border-dashed text-gray-500 italic text-xs'
                  )}>
                    {item.conteudo}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
