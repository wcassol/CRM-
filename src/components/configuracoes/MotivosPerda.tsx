'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'

const PIPELINE_LABELS: Record<string, string> = { comercial: 'Comercial', perdas: 'Reativação' }
const PIPELINE_COLORS: Record<string, string> = { comercial: 'bg-blue-100 text-blue-700', perdas: 'bg-orange-100 text-orange-700' }

export function MotivosPerda() {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [desc, setDesc] = useState('')
  const [pipeline, setPipeline] = useState<'comercial' | 'perdas'>('comercial')

  const { data = [], isLoading } = trpc.settings.listLossReasons.useQuery({})

  const create = trpc.settings.createLossReason.useMutation({
    onSuccess: () => { utils.settings.listLossReasons.invalidate(); setDesc(''); setShowForm(false); toast({ title: 'Motivo criado!' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })
  const del = trpc.settings.deleteLossReason.useMutation({
    onSuccess: () => { utils.settings.listLossReasons.invalidate(); toast({ title: 'Motivo removido.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const comercial = data.filter((d: any) => d.pipeline === 'comercial')
  const perdas    = data.filter((d: any) => d.pipeline === 'perdas')

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Motivos de Perda</h2>
          <p className="text-sm text-gray-500 mt-0.5">Configure os motivos disponíveis ao marcar um lead como perdido.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo motivo
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-purple-900">Novo motivo de perda</h3>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição do motivo..." className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
          <div className="flex gap-2 items-center">
            <select value={pipeline} onChange={e => setPipeline(e.target.value as any)} className="px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none bg-white focus:ring-2 focus:ring-purple-400">
              <option value="comercial">Pipeline Comercial</option>
              <option value="perdas">Pipeline Reativação</option>
            </select>
            <button onClick={() => create.mutate({ descricao: desc, pipeline })} disabled={!desc.trim() || create.isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors ml-auto">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      )}

      {[{ label: 'Comercial', items: comercial }, { label: 'Reativação', items: perdas }].map(({ label, items }) => (
        <div key={label}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center text-sm text-gray-400">Nenhum motivo cadastrado.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-800">{item.descricao}</span>
                  <button onClick={() => del.mutate({ id: item.id })} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
