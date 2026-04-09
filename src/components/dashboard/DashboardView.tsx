'use client'

import {
  Users, Calendar, FileText, CreditCard, CheckSquare,
  TrendingUp, GitMerge, AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { MetricCard } from '@/components/shared/MetricCard'
import { MetricsSkeleton } from '@/components/shared/LoadingSkeleton'
import { FunnelChart } from './FunnelChart'
import { AppointmentsWidget } from './AppointmentsWidget'
import { TasksWidget } from './TasksWidget'
import { RecentLeads } from './RecentLeads'

export function DashboardView() {
  const router = useRouter()
  const { data: metrics, isLoading: loadingMetrics } = trpc.dashboard.metrics.useQuery()
  const { data: funnel,  isLoading: loadingFunnel  } = trpc.dashboard.funnel.useQuery()

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Metrics row */}
      {loadingMetrics ? <MetricsSkeleton /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <MetricCard
            label="Leads hoje"
            value={metrics?.leads_hoje ?? 0}
            icon={Users}
            color="blue"
            onClick={() => router.push('/leads')}
          />
          <MetricCard
            label="Reuniões hoje"
            value={metrics?.reunioes_hoje ?? 0}
            icon={Calendar}
            color="purple"
          />
          <MetricCard
            label="Propostas abertas"
            value={metrics?.propostas_abertas ?? 0}
            icon={FileText}
            color="amber"
          />
          <MetricCard
            label="Contratos pendentes"
            value={metrics?.contratos_pendentes ?? 0}
            icon={TrendingUp}
            color="slate"
          />
          <MetricCard
            label="Cobranças pendentes"
            value={metrics?.cobracas_pendentes ?? 0}
            icon={CreditCard}
            color="green"
          />
          <MetricCard
            label="Tarefas vencidas"
            value={metrics?.tarefas_vencidas ?? 0}
            icon={AlertCircle}
            color={metrics?.tarefas_vencidas ? 'red' : 'slate'}
            onClick={() => router.push('/tarefas?filter=vencidas')}
          />
          <MetricCard
            label="Em onboarding"
            value={metrics?.onboardings_ativos ?? 0}
            icon={GitMerge}
            color="green"
            onClick={() => router.push('/onboarding')}
          />
        </div>
      )}

      {/* Funil + Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Funil Comercial</h2>
          <FunnelChart data={funnel ?? []} loading={loadingFunnel} />
        </div>
        <AppointmentsWidget />
      </div>

      {/* Tarefas + Leads Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TasksWidget />
        <RecentLeads />
      </div>
    </div>
  )
}
