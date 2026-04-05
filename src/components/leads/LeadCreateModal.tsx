'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { LeadCreateSchema, type LeadCreateInput } from '@/lib/validators/lead.schema'
import { cn } from '@/lib/utils/cn'
import { useToast } from '@/hooks/useToast'

interface LeadCreateModalProps {
  open:      boolean
  onClose:   () => void
  onSuccess: (id: string) => void
}

export function LeadCreateModal({ open, onClose, onSuccess }: LeadCreateModalProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const { data: duplicates, refetch: checkDuplicate } = trpc.leads.checkDuplicate.useQuery(
    { telefone: '' }, { enabled: false }
  )

  const create = trpc.leads.create.useMutation({
    onSuccess: (lead) => {
      utils.leads.kanban.invalidate()
      utils.leads.list.invalidate()
      toast({ title: 'Lead criado com sucesso!' })
      onSuccess(lead.id)
    },
    onError: (err) => {
      toast({ title: err.message, variant: 'destructive' })
    },
  })

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LeadCreateInput>({
    resolver: zodResolver(LeadCreateSchema),
    defaultValues: { urgencia: 'media', prazo_sensivel: false },
  })

  const { data: users } = trpc.users.byRole.useQuery('comercial')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Novo Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(data => create.mutate(data))}
          className="overflow-y-auto flex-1 p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome *" error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Nome completo" className={inputCls(!!errors.nome)} />
            </Field>
            <Field label="Telefone *" error={errors.telefone?.message}>
              <input {...register('telefone')} placeholder="(11) 99999-9999" className={inputCls(!!errors.telefone)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="email@exemplo.com" className={inputCls(!!errors.email)} />
            </Field>
            <Field label="CPF">
              <input {...register('cpf')} placeholder="000.000.000-00" className={inputCls()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Área Jurídica">
              <select {...register('area_juridica')} className={inputCls()}>
                <option value="">Selecionar...</option>
                {['previdenciario','trabalhista','civil','consumidor','criminal','familia','tributario','empresarial'].map(a => (
                  <option key={a} value={a} className="capitalize">{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Urgência">
              <select {...register('urgencia')} className={inputCls()}>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
                <option value="baixa">Baixa</option>
              </select>
            </Field>
          </div>

          <Field label="Resumo do Caso">
            <textarea
              {...register('resumo_caso')}
              rows={3}
              placeholder="Descreva brevemente a situação do cliente..."
              className={cn(inputCls(), 'resize-none')}
            />
          </Field>

          <Field label="Responsável Comercial">
            <select {...register('responsavel_comercial_id')} className={inputCls()}>
              <option value="">Atribuir a mim</option>
              {(users ?? []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-2">
            <input
              {...register('prazo_sensivel')}
              type="checkbox"
              id="prazo_sensivel"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="prazo_sensivel" className="text-sm text-gray-700">
              Possui prazo jurídico sensível
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="lead-create-form"
            disabled={create.isPending}
            onClick={handleSubmit(data => create.mutate(data))}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Lead
          </button>
        </div>
      </div>
    </div>
  )
}

function inputCls(hasError?: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-blue-400 focus:border-blue-400',
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
