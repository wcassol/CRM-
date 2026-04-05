import { Flame, Thermometer, Snowflake } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TemperaturaLead } from '@/types/database.types'

const CONFIG = {
  quente: { label: 'Quente', icon: Flame,       className: 'bg-red-100 text-red-700' },
  morno:  { label: 'Morno',  icon: Thermometer,  className: 'bg-amber-100 text-amber-700' },
  frio:   { label: 'Frio',   icon: Snowflake,    className: 'bg-blue-100 text-blue-600' },
}

export function TemperaturaBadge({ temperatura }: { temperatura: TemperaturaLead }) {
  const { label, icon: Icon, className } = CONFIG[temperatura]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
