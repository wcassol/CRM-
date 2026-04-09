'use client'

import { BarChart3, TrendingUp, Users, CreditCard, FileText, Calendar, GitMerge, CheckSquare } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { trpc } from '@/lib/trpc/client'

export default function RelatoriosPage() {
  const { data: metrics, isLoading } = trpc.dashboard.metrics.useQuery()

  const cards = [
    { label: 'Leads hoje',           value: metrics?.leads_hoje          ?? '—', icon: Users,      color: 'from-purple-500 to-purple-600', shadow: 'shadow-[0_8px_24px_rgba(139,92,246,0.3)]' },
    { label: 'Reuniões hoje',        value: metrics?.reunioes_hoje       ?? '—', icon: Calendar,   color: 'from-blue-500 to-blue-600',     shadow: 'shadow-[0_8px_24px_rgba(59,130,246,0.3)]' },
    { label: 'Propostas abertas',    value: metrics?.propostas_abertas   ?? '—', icon: FileText,   color: 'from-amber-400 to-orange-500',  shadow: 'shadow-[0_8px_24px_rgba(245,158,11,0.3)]' },
    { label: 'Contratos pendentes',  value: metrics?.contratos_pendentes ?? '—', icon: TrendingUp, color: 'from-slate-500 to-slate-700',   shadow: 'shadow-[0_8px_24px_rgba(100,116,139,0.3)]' },
    { label: 'Cobranças pendentes',  value: metrics?.cobracas_pendentes  ?? '—', icon: CreditCard, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-[0_8px_24px_rgba(16,185,129,0.3)]' },
    { label: 'Tarefas vencidas',     value: metrics?.tarefas_vencidas    ?? '—', icon: CheckSquare,color: 'from-red-500 to-rose-600',      shadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.3)]' },
    { label: 'Em onboarding',        value: metrics?.onboardings_ativos  ?? '—', icon: GitMerge,   color: 'from-teal-500 to-teal-600',    shadow: 'shadow-[0_8px_24px_rgba(20,184,166,0.3)]' },
  ]

  return (
    <>
      <Topbar title="Relatórios" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* KPI Cards */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Resumo Geral</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cards.map(({ label, value, icon: Icon, color, shadow }) => (
                <div key={label} className={`bg-gradient-to-br ${color} ${shadow} rounded-2xl p-5 text-white`}>
                  {isLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 w-3/4 bg-white/30 rounded" />
                      <div className="h-8 w-1/2 bg-white/30 rounded mt-2" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/70 font-semibold uppercase tracking-wide">{label}</span>
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold">{String(value)}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Pipeline Funnel */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Funil do Pipeline</h2>
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
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-6 space-y-3 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-xl bg-purple-50 animate-pulse" />)}
    </div>
  )

  if (!data?.length) return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-8 text-center text-sm text-gray-400 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      Sem dados de pipeline ainda.
    </div>
  )

  const max = Math.max(...data.map(d => d.total))

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-6 space-y-4 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      {data.map(({ etapa, total, valor_total }) => (
        <div key={etapa} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700 capitalize">{etapa.replace(/_/g, ' ')}</span>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="text-xs">{total} leads</span>
              {valor_total > 0 && (
                <span className="text-emerald-600 font-semibold text-xs">
                  R$ {Number(valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
          <div className="h-3 bg-purple-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
