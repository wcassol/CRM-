import { z } from 'zod'
import { UuidSchema, MoneySchema } from './shared.schema'

export const ProposalStatusZ = z.enum(['rascunho', 'enviada', 'aceita', 'recusada', 'expirada'])

export const ProposalCreateSchema = z.object({
  lead_id:                UuidSchema,
  valor:                  MoneySchema,
  condicao_pagamento:     z.string().max(200).optional(),
  observacoes:            z.string().max(2000).optional().nullable(),
  objecoes:               z.string().max(1000).optional().nullable(),
  chance_fechamento_pct:  z.number().int().min(0).max(100).optional(),
  validade_dias:          z.number().int().min(1).max(90).default(7),
})

export type ProposalCreateInput = z.infer<typeof ProposalCreateSchema>

export const ProposalUpdateSchema = z.object({
  id:                     UuidSchema,
  valor:                  MoneySchema.optional(),
  condicao_pagamento:     z.string().max(200).optional().nullable(),
  observacoes:            z.string().max(2000).optional().nullable(),
  objecoes:               z.string().max(1000).optional().nullable(),
  chance_fechamento_pct:  z.number().int().min(0).max(100).optional().nullable(),
  status:                 ProposalStatusZ.optional(),
  validade_dias:          z.number().int().min(1).max(90).optional(),
})

export type ProposalUpdateInput = z.infer<typeof ProposalUpdateSchema>
