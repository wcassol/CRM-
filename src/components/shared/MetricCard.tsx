import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label:    string
  value:    string | number
  icon:     LucideIcon
  trend?:   { value: number; label: string }
  color?:   'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
  onClick?: () => void
  loading?: boolean
}

const colorMap = {
  blue:   {
    card: 'bg-gradient-to-br from-blue-500 to-blue-600',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(59,130,246,0.3)]',
  },
  green:  {
    card: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(16,185,129,0.3)]',
  },
  amber:  {
    card: 'bg-gradient-to-br from-amber-400 to-orange-500',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(245,158,11,0.3)]',
  },
  red:    {
    card: 'bg-gradient-to-br from-red-500 to-rose-600',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.3)]',
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-500 to-purple-700',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(139,92,246,0.35)]',
  },
  slate:  {
    card: 'bg-gradient-to-br from-slate-500 to-slate-700',
    icon: 'bg-white/20 text-white',
    shadow: 'shadow-[0_8px_24px_rgba(100,116,139,0.3)]',
  },
}

export function MetricCard({ label, value, icon: Icon, trend, color = 'blue', onClick, loading }: MetricCardProps) {
  const c = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        c.card, c.shadow,
        'rounded-2xl p-5 text-white transition-all',
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-xl',
        loading && 'animate-pulse opacity-70'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold mt-1.5">
            {loading ? <span className="bg-white/20 rounded w-12 h-8 inline-block" /> : value}
          </p>
          {trend && (
            <p className="text-xs mt-1 text-white/80">
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
