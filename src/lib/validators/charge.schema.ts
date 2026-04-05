import { z } from 'zod'
import { UuidSchema, MoneySchema, DateSchema } from './shared.schema'

export const ChargeStatusZ = z.enum(['pendente', 'pago', 'atrasado', 'cancelado', 'estornado'])

export const ChargeCreateSchema = z.object({
  lead_id:      UuidSchema,
  contract_id:  UuidSchema.optional(),
  valor:        MoneySchema,
  vencimento:   DateSchema,
  descricao:    z.string().max(200).default('Honorários advocatícios'),
  // Se true, cria a cobrança no Asaas imediatamente
  enviar_asaas: z.boolean().default(true),
})

export type ChargeCreateInput = z.infer<typeof ChargeCreateSchema>

export const ChargeUpdateSchema = z.object({
  id:             UuidSchema,
  status:         ChargeStatusZ.optional(),
  pago_em:        z.string().datetime().optional().nullable(),
  link_pagamento: z.string().url().optional().nullable(),
  asaas_id:       z.string().optional().nullable(),
})

export type ChargeUpdateInput = z.infer<typeof ChargeUpdateSchema>
