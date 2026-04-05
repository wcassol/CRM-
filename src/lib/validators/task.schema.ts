import { z } from 'zod'
import { UuidSchema } from './shared.schema'

export const TaskPrioridadeZ = z.enum(['baixa', 'media', 'alta', 'urgente'])
export const TaskStatusZ     = z.enum(['aberta', 'em_andamento', 'concluida', 'cancelada'])

export const TaskCreateSchema = z.object({
  lead_id:        UuidSchema.optional(),
  titulo:         z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  descricao:      z.string().max(1000).optional().nullable(),
  responsavel_id: UuidSchema,
  vencimento:     z.string().datetime('Data/hora inválida'),
  prioridade:     TaskPrioridadeZ.default('media'),
  lembrete_em:    z.string().datetime().optional().nullable(),
})

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>

export const TaskUpdateSchema = z.object({
  id:             UuidSchema,
  titulo:         z.string().min(3).max(200).optional(),
  descricao:      z.string().max(1000).optional().nullable(),
  responsavel_id: UuidSchema.optional(),
  vencimento:     z.string().datetime().optional(),
  prioridade:     TaskPrioridadeZ.optional(),
  status:         TaskStatusZ.optional(),
  lembrete_em:    z.string().datetime().optional().nullable(),
})

export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>

export const TaskCompleteSchema = z.object({
  id: UuidSchema,
})

export type TaskCompleteInput = z.infer<typeof TaskCompleteSchema>

export const TaskListSchema = z.object({
  lead_id:        UuidSchema.optional(),
  responsavel_id: UuidSchema.optional(),
  status:         TaskStatusZ.optional(),
  prioridade:     TaskPrioridadeZ.optional(),
  apenas_vencidas:z.boolean().optional(),
  page:           z.number().int().min(1).default(1),
  per_page:       z.number().int().min(1).max(100).default(50),
})

export type TaskListInput = z.infer<typeof TaskListSchema>
