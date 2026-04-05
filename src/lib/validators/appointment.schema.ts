import { z } from 'zod'
import { UuidSchema } from './shared.schema'

export const AppointmentStatusZ = z.enum([
  'agendada', 'confirmada', 'reagendada', 'realizada', 'faltou', 'cancelada',
])

export const AppointmentCreateSchema = z.object({
  lead_id:      UuidSchema,
  titulo:       z.string().min(3).max(200).default('Reunião de consultoria'),
  data_hora:    z.string().datetime('Data/hora inválida'),
  duracao_min:  z.number().int().min(15).max(480).default(60),
  link_meet:    z.string().url('URL inválida').optional().nullable(),
  cal_event_id: z.string().optional().nullable(),
  observacoes:  z.string().max(1000).optional().nullable(),
})

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>

export const AppointmentUpdateSchema = z.object({
  id:           UuidSchema,
  titulo:       z.string().min(3).max(200).optional(),
  data_hora:    z.string().datetime().optional(),
  duracao_min:  z.number().int().min(15).max(480).optional(),
  link_meet:    z.string().url().optional().nullable(),
  status:       AppointmentStatusZ.optional(),
  resultado:    z.string().max(2000).optional().nullable(),
  observacoes:  z.string().max(1000).optional().nullable(),
})

export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>

// Preenchido após reunião realizada
export const AppointmentResultSchema = z.object({
  id:        UuidSchema,
  status:    z.enum(['realizada', 'faltou', 'cancelada']),
  resultado: z.string().max(2000).optional().nullable(),
}).refine(
  data => data.status !== 'realizada' || (data.resultado && data.resultado.length > 5),
  { message: 'Descreva o resultado da reunião', path: ['resultado'] }
)

export type AppointmentResultInput = z.infer<typeof AppointmentResultSchema>
