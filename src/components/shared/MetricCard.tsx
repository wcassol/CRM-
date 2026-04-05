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
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
  slate:  { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
}

export function MetricCard({ label, value, icon: Icon, trend, color = 'blue', onClick, loading }: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-5 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        loading && 'animate-pulse'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? <span className="bg-gray-200 rounded w-12 h-7 inline-block" /> : value}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
