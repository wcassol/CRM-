'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { SendToAstreaSchema, type SendToAstreaInput } from '@/lib/validators/onboarding.schema'
import { useToast } from '@/hooks/useToast'

interface Props {
  checklistId: string
  leadNome:    string
  onClose:     () => void
}

export function AstreaModal({ checklistId, leadNome, onClose }: Props) {
  const { toast } = useToast()
  const utils     = trpc.useUtils()

  const send = trpc.onboarding.sendToAstrea.useMutation({
    onSuccess: () => {
      utils.onboarding.list.invalidate()
      toast({ title: `${leadNome} enviado ao Astrea com sucesso!` })
      onClose()
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<SendToAstreaInput>({
    resolver: zodResolver(SendToAstreaSchema),
    defaultValues: { checklist_id: checklistId },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-green-600" />
            <h2 className="text-base font-semibold">Enviar ao Astrea</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => send.mutate(d))} className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Confirme antes de enviar</p>
              <p className="text-xs mt-0.5">
                Após confirmar, o caso de <strong>{leadNome}</strong> será registrado como enviado ao Astrea.
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <input {...register('checklist_id')} type="hidden" />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Referência no Astrea *
            </label>
            <input
              {...register('referencia_astrea')}
              placeholder="Ex: 2024/001234 ou ID do processo"
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-green-400 ${
                errors.referencia_astrea ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.referencia_astrea && (
              <p className="text-xs text-red-500 mt-0.5">{errors.referencia_astrea.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Informe o número do processo ou ID gerado no Astrea.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={send.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
              {send.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar envio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
