'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { TaskCreateSchema, type TaskCreateInput } from '@/lib/validators/task.schema'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'

interface Props { open: boolean; onClose: () => void; leadId?: string }

export function TarefaCreateModal({ open, onClose, leadId }: Props) {
  const { user }   = useCurrentUser()
  const { toast }  = useToast()
  const utils      = trpc.useUtils()
  const { data: users } = trpc.users.list.useQuery()

  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate()
      utils.dashboard.tarefasVencidas.invalidate()
      toast({ title: 'Tarefa criada!' })
      onClose()
      reset()
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskCreateInput>({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      lead_id:        leadId,
      responsavel_id: user?.id,
      prioridade:     'media',
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Nova Tarefa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Título *</label>
            <input
              {...register('titulo')}
              placeholder="O que precisa ser feito?"
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400',
                errors.titulo ? 'border-red-400' : 'border-gray-200'
              )}
            />
            {errors.titulo && <p className="text-xs text-red-500 mt-0.5">{errors.titulo.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
            <textarea
              {...register('descricao')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento *</label>
              <input
                {...register('vencimento')}
                type="datetime-local"
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400',
                  errors.vencimento ? 'border-red-400' : 'border-gray-200'
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridade</label>
              <select {...register('prioridade')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável *</label>
            <select
              {...register('responsavel_id')}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400',
                errors.responsavel_id ? 'border-red-400' : 'border-gray-200'
              )}
            >
              {(users ?? []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
