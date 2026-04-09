'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, Calendar } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'

// Schema local — vencimento aceita string no formato do input date (YYYY-MM-DD)
const LocalSchema = z.object({
  lead_id:        z.string().uuid().optional(),
  titulo:         z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  descricao:      z.string().max(1000).optional().nullable(),
  responsavel_id: z.string().uuid({ message: 'Selecione um responsável' }),
  vencimento:     z.string().min(1, 'Selecione a data de vencimento'),
  prioridade:     z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
})
type LocalInput = z.infer<typeof LocalSchema>

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocalInput>({
    resolver: zodResolver(LocalSchema),
    defaultValues: {
      lead_id:        leadId,
      responsavel_id: user?.id ?? '',
      prioridade:     'media',
    },
  })

  function onSubmit(data: LocalInput) {
    // Converte YYYY-MM-DD para ISO string com horário 09:00 local
    const [year, month, day] = data.vencimento.split('-')
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day), 9, 0, 0)
    create.mutate({
      ...data,
      vencimento: dateObj.toISOString(),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-purple-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Nova Tarefa</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título *</label>
            <input
              {...register('titulo')}
              placeholder="O que precisa ser feito?"
              className={cn(
                'w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all',
                errors.titulo ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              )}
            />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
            <textarea
              {...register('descricao')}
              rows={2}
              placeholder="Detalhes opcionais..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none transition-all"
            />
          </div>

          {/* Vencimento + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vencimento *</label>
              <input
                {...register('vencimento')}
                type="date"
                className={cn(
                  'w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all',
                  errors.vencimento ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                )}
              />
              {errors.vencimento && <p className="text-xs text-red-500 mt-1">{errors.vencimento.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prioridade</label>
              <select
                {...register('prioridade')}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Responsável *</label>
            <select
              {...register('responsavel_id')}
              className={cn(
                'w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all',
                errors.responsavel_id ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              )}
            >
              <option value="">Selecione...</option>
              {(users ?? []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            {errors.responsavel_id && <p className="text-xs text-red-500 mt-1">{errors.responsavel_id.message}</p>}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 transition-all shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
            >
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
