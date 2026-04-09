'use client'

import { BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { trpc } from '@/lib/trpc/client'

export default function RelatoriosPage() {
  const { data: stats } = trpc.dashboard.stats.useQuery()

  const cards = [
    { label: 'Total de Leads',       value: stats?.total_leads      ?? '—', icon: Users,      color: 'bg-blue-50 text-blue-600' },
    { label: 'Leads Ativos',         value: stats?.leads_ativos     ?? '—', icon: TrendingUp,  color: 'bg-green-50 text-green-600' },
    { label: 'Fechados este mês',    value: stats?.fechados_mes     ?? '—', icon: FileText,    color: 'bg-purple-50 text-purple-600' },
    { label: 'Receita Estimada',     value: stats?.valor_pipeline   ? `R$ ${Number(stats.valor_pipeline).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
    { label: 'Reuniões Agendadas',   value: stats?.reunioes_semana  ?? '—', icon: Calendar,    color: 'bg-rose-50 text-rose-600' },
    { label: 'Taxa de Conversão',    value: stats?.taxa_conversao   ? `${stats.taxa_conversao}%` : '—', icon: BarChart3, color: 'bg-indigo-50 text-indigo-600' },
  ]

  return (
    <>
      <Topbar title="Relatórios" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* KPI Cards */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Resumo Geral</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {cards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">{label}</span>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pipeline Funnel */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Funil do Pipeline</h2>
            <PipelineFunnel />
          </section>

        </div>
      </main>
    </>
  )
}

function PipelineFunnel() {
  const { data, isLoading } = trpc.dashboard.funnel.useQuery()

  if (isLoading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
    </div>
  )

  if (!data?.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
      Sem dados de pipeline ainda.
    </div>
  )

  const max = Math.max(...data.map(d => d.total))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      {data.map(({ etapa, total, valor_total }) => (
        <div key={etapa} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 capitalize">{etapa.replace(/_/g, ' ')}</span>
            <div className="flex items-center gap-4 text-gray-500">
              <span>{total} leads</span>
              {valor_total > 0 && (
                <span className="text-green-600 font-medium">
                  R$ {Number(valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
