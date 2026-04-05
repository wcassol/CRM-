'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { ETAPAS_COMERCIAL } from '@/lib/constants/pipeline-stages'
import { formatCurrency } from '@/lib/utils/format'

interface FunnelChartProps {
  data:    Array<{ etapa: string; total: number; valor_total: number }>
  loading: boolean
}

const STAGE_COLORS = [
  '#94a3b8', '#60a5fa', '#818cf8', '#a78bfa',
  '#f59e0b', '#f97316', '#10b981', '#059669',
]

export function FunnelChart({ data, loading }: FunnelChartProps) {
  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }

  const chartData = data.map((d, i) => ({
    ...d,
    label: ETAPAS_COMERCIAL[d.etapa as keyof typeof ETAPAS_COMERCIAL]?.label ?? d.etapa,
    fill:  STAGE_COLORS[i % STAGE_COLORS.length],
  }))

  const total = data.reduce((acc, d) => acc + d.total, 0)

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        Nenhum lead no pipeline
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]!.payload
              return (
                <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-xs">
                  <p className="font-semibold text-gray-900">{d.label}</p>
                  <p className="text-gray-500">{d.total} lead{d.total !== 1 ? 's' : ''}</p>
                  {d.valor_total > 0 && (
                    <p className="text-green-600">{formatCurrency(d.valor_total)}</p>
                  )}
                </div>
              )
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda rápida */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {chartData.slice(0, 4).map((d, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-sm" style={{ background: d.fill }} />
            {d.label}: <span className="font-medium text-gray-700">{d.total}</span>
          </div>
        ))}
        {chartData.length > 4 && (
          <span className="text-[10px] text-gray-400">+{chartData.length - 4} etapas</span>
        )}
      </div>
    </div>
  )
}
