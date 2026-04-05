import { cn } from '@/lib/utils/cn'
import { ETAPAS_COMERCIAL } from '@/lib/constants/pipeline-stages'
import type { EtapaComercial } from '@/types/database.types'

export function EtapaBadge({ etapa }: { etapa: EtapaComercial }) {
  const config = ETAPAS_COMERCIAL[etapa]
  if (!config) return null
  return (
    <span className={cn(
      'inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border',
      config.cor, config.corTexto, config.corBorda
    )}>
      {config.label}
    </span>
  )
}
