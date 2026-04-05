import { z } from 'zod'
import { UuidSchema } from './shared.schema'

export const ContractStatusZ = z.enum(['pendente', 'enviado', 'assinado', 'cancelado', 'expirado'])

// Enviado pelo comercial para iniciar o fluxo ZapSign
export const ContractSendSchema = z.object({
  lead_id:     UuidSchema,
  proposal_id: UuidSchema.optional(),
  // O template do contrato é configurado nas integrações; aqui só precisamos confirmar
  template_id: z.string().optional(),  // ID do template no ZapSign (opcional se houver padrão)
})

export type ContractSendInput = z.infer<typeof ContractSendSchema>

// Atualização manual de status (caso webhook falhe)
export const ContractUpdateSchema = z.object({
  id:             UuidSchema,
  status:         ContractStatusZ,
  zapsign_token:  z.string().optional().nullable(),
  link_documento: z.string().url().optional().nullable(),
  assinado_em:    z.string().datetime().optional().nullable(),
})

export type ContractUpdateInput = z.infer<typeof ContractUpdateSchema>
