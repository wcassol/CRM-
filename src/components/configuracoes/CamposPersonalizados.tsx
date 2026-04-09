'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'

const TIPO_LABELS: Record<string, string> = { text: 'Texto', number: 'Número', date: 'Data', boolean: 'Sim/Não', select: 'Seleção' }
const TIPO_COLORS: Record<string, string> = { text: 'bg-blue-50 text-blue-700', number: 'bg-green-50 text-green-700', date: 'bg-amber-50 text-amber-700', boolean: 'bg-purple-50 text-purple-700', select: 'bg-rose-50 text-rose-700' }
const AREAS = ['','previdenciario','trabalhista','consumidor','civel','criminal','familia','tributario','empresarial']
const AREA_LABELS: Record<string, string> = { '': 'Todas as áreas', previdenciario: 'Previdenciário', trabalhista: 'Trabalhista', consumidor: 'Consumidor', civel: 'Cível', criminal: 'Criminal', familia: 'Família', tributario: 'Tributário', empresarial: 'Empresarial' }

type CampoTipo = 'text' | 'number' | 'date' | 'boolean' | 'select'
const defaultForm = { nome: '', label: '', tipo: 'text' as CampoTipo, area_juridica: '', obrigatorio: false, opcoes: '' }

export function CamposPersonalizados() {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const { data = [], isLoading } = trpc.settings.listCustomFields.useQuery()

  const create = trpc.settings.createCustomField.useMutation({
    onSuccess: () => {
      utils.settings.listCustomFields.invalidate()
      setForm(defaultForm)
      setShowForm(false)
      toast({ title: 'Campo criado!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const del = trpc.settings.deleteCustomField.useMutation({
    onSuccess: () => { utils.settings.listCustomFields.invalidate(); toast({ title: 'Campo removido.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  function handleCreate() {
    create.mutate({
      nome: form.nome,
      label: form.label,
      tipo: form.tipo as any,
      area_juridica: form.area_juridica || undefined,
      obrigatorio: form.obrigatorio,
      opcoes: form.tipo === 'select' ? form.opcoes.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Campos Personalizados</h2>
          <p className="text-sm text-gray-500 mt-0.5">Adicione campos extras ao formulário de leads.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo campo
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-purple-900">Novo campo personalizado</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rótulo (exibição) *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value, nome: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '') }))} placeholder="Ex: Número do Benefício" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                {Object.entries(TIPO_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Área jurídica</label>
              <select value={form.area_juridica} onChange={e => setForm(f => ({ ...f, area_juridica: e.target.value }))} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.obrigatorio} onChange={e => setForm(f => ({ ...f, obrigatorio: e.target.checked }))} className="rounded" />
                Campo obrigatório
              </label>
            </div>
          </div>
          {form.tipo === 'select' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Opções (uma por linha)</label>
              <textarea value={form.opcoes} onChange={e => setForm(f => ({ ...f, opcoes: e.target.value }))} rows={3} placeholder="Opção 1&#10;Opção 2&#10;Opção 3" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none" />
            </div>
          )}
          <p className="text-xs text-gray-400">Chave interna: <code className="bg-white px-1 rounded">{form.nome || 'será_gerado_automaticamente'}</code></p>
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={!form.label.trim() || create.isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Criar campo
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : (data as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">Nenhum campo personalizado cadastrado.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {(data as any[]).map((field: any) => (
            <div key={field.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800 truncate">{field.label}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${TIPO_COLORS[field.tipo]}`}>{TIPO_LABELS[field.tipo]}</span>
                  {field.obrigatorio && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">Obrigatório</span>}
                  {field.area_juridica && <span className="text-xs text-gray-400 shrink-0">{AREA_LABELS[field.area_juridica]}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{field.nome}</p>
              </div>
              <button onClick={() => del.mutate({ id: field.id })} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
