'use client'

import { X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

const AREAS = [
  'previdenciario', 'trabalhista', 'civil', 'consumidor',
  'criminal', 'familia', 'tributario', 'empresarial', 'imobiliario',
]
const TEMPERATURA = ['frio', 'morno', 'quente']
const VIABILIDADE = ['viavel', 'inviavel', 'pendente']

interface LeadFiltersProps {
  values:   Record<string, string>
  onChange: (v: Record<string, string>) => void
  onClose:  () => void
}

export function LeadFilters({ values, onChange, onClose }: LeadFiltersProps) {
  const { data: users }   = trpc.users.list.useQuery()
  const { data: sources } = trpc.leads.list.useQuery({ page: 1, per_page: 1 })  // apenas para carregar sources

  function set(key: string, value: string) {
    onChange({ ...values, [key]: value })
  }

  function clear() {
    onChange({})
    onClose()
  }

  const hasFilters = Object.values(values).some(Boolean)

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select label="Temperatura" value={values.temperatura ?? ''} onChange={v => set('temperatura', v)}>
        <option value="">Todas</option>
        {TEMPERATURA.map(t => (
          <option key={t} value={t} className="capitalize">{t}</option>
        ))}
      </Select>

      <Select label="Área Jurídica" value={values.area_juridica ?? ''} onChange={v => set('area_juridica', v)}>
        <option value="">Todas</option>
        {AREAS.map(a => (
          <option key={a} value={a} className="capitalize">{a}</option>
        ))}
      </Select>

      <Select label="Viabilidade" value={values.viabilidade ?? ''} onChange={v => set('viabilidade', v)}>
        <option value="">Todas</option>
        {VIABILIDADE.map(v => (
          <option key={v} value={v} className="capitalize">{v}</option>
        ))}
      </Select>

      <Select label="Responsável" value={values.responsavel_id ?? ''} onChange={v => set('responsavel_id', v)}>
        <option value="">Todos</option>
        {(users ?? []).map(u => (
          <option key={u.id} value={u.id}>{u.full_name}</option>
        ))}
      </Select>

      <Select label="Data de entrada" value={values.data_inicio ?? ''} onChange={v => set('data_inicio', v)}>
        <option value="">Qualquer data</option>
        <option value={new Date(Date.now() - 86400000).toISOString().slice(0,10)}>Ontem+</option>
        <option value={new Date(Date.now() - 7*86400000).toISOString().slice(0,10)}>Últimos 7 dias</option>
        <option value={new Date(Date.now() - 30*86400000).toISOString().slice(0,10)}>Últimos 30 dias</option>
      </Select>

      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 px-2 py-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Limpar filtros
        </button>
      )}
    </div>
  )
}

function Select({ label, value, onChange, children }: {
  label: string; value: string
  onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
      >
        {children}
      </select>
    </div>
  )
}
