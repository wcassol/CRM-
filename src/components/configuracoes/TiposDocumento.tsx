'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'

const AREAS = ['previdenciario','trabalhista','consumidor','civel','criminal','familia','tributario','empresarial']
const AREA_LABELS: Record<string, string> = {
  previdenciario: 'Previdenciário', trabalhista: 'Trabalhista', consumidor: 'Consumidor',
  civel: 'Cível', criminal: 'Criminal', familia: 'Família', tributario: 'Tributário', empresarial: 'Empresarial',
}

const defaultForm = { nome: '', area_juridica: 'previdenciario', obrigatorio: true, instrucoes: '' }

export function TiposDocumento() {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [selectedArea, setSelectedArea] = useState<string | undefined>(undefined)
  const [form, setForm] = useState(defaultForm)

  const { data = [], isLoading } = trpc.settings.listDocumentTypes.useQuery({ area_juridica: selectedArea })

  const create = trpc.settings.createDocumentType.useMutation({
    onSuccess: () => {
      utils.settings.listDocumentTypes.invalidate()
      setForm(defaultForm)
      setShowForm(false)
      toast({ title: 'Tipo de documento criado!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const del = trpc.settings.deleteDocumentType.useMutation({
    onSuccess: () => { utils.settings.listDocumentTypes.invalidate(); toast({ title: 'Removido.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const grouped = AREAS.reduce((acc, area) => {
    const items = (data as any[]).filter(d => d.area_juridica === area)
    if (items.length > 0 || !selectedArea) acc[area] = items
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tipos de Documento</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os documentos exigidos por área jurídica.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo tipo
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedArea(undefined)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!selectedArea ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>Todas</button>
        {AREAS.map(a => (
          <button key={a} onClick={() => setSelectedArea(a === selectedArea ? undefined : a)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedArea === a ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {AREA_LABELS[a]}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-purple-900">Novo tipo de documento</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: RG ou CNH" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Área Jurídica *</label>
              <select value={form.area_juridica} onChange={e => setForm(f => ({ ...f, area_juridica: e.target.value }))} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
              </select>
            </div>
          </div>
          <input value={form.instrucoes} onChange={e => setForm(f => ({ ...f, instrucoes: e.target.value }))} placeholder="Instruções para o cliente (opcional)" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.obrigatorio} onChange={e => setForm(f => ({ ...f, obrigatorio: e.target.checked }))} className="rounded" />
              Obrigatório
            </label>
            <button onClick={() => create.mutate({ nome: form.nome, area_juridica: form.area_juridica, obrigatorio: form.obrigatorio, instrucoes: form.instrucoes || undefined })} disabled={!form.nome.trim() || create.isPending} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : (
        Object.entries(grouped).map(([area, items]) => items.length > 0 && (
          <div key={area}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{AREA_LABELS[area]}</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    {item.obrigatorio ? <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.nome}</p>
                      {item.instrucoes && <p className="text-xs text-gray-400">{item.instrucoes}</p>}
                    </div>
                  </div>
                  <button onClick={() => del.mutate({ id: item.id })} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
