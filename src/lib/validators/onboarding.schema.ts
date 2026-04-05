import { z } from 'zod'
import { UuidSchema } from './shared.schema'

export const OnboardingItemStatusZ = z.enum(['pendente', 'em_andamento', 'concluido', 'bloqueado'])

export const OnboardingItemUpdateSchema = z.object({
  id:         UuidSchema,
  status:     OnboardingItemStatusZ,
  observacao: z.string().max(1000).optional().nullable(),
})

export type OnboardingItemUpdateInput = z.infer<typeof OnboardingItemUpdateSchema>

export const OnboardingAssignSchema = z.object({
  checklist_id:           UuidSchema,
  responsavel_juridico_id: UuidSchema,
})

export type OnboardingAssignInput = z.infer<typeof OnboardingAssignSchema>

export const SendToAstreaSchema = z.object({
  checklist_id:      UuidSchema,
  referencia_astrea: z.string().min(1, 'Informe a referência do caso no Astrea').max(100),
})

export type SendToAstreaInput = z.infer<typeof SendToAstreaSchema>
