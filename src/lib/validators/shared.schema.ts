// =============================================================================
// CRM JURÍDICO — SHARED SCHEMAS
// Schemas reutilizados em vários módulos
// =============================================================================

import { z } from 'zod'

export const UuidSchema   = z.string().uuid('ID inválido')
export const CpfSchema    = z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
export const TelefoneSchema = z.string().min(10).max(20).transform(v => v.replace(/\D/g, ''))
export const MoneySchema  = z.number().positive('Valor deve ser positivo').multipleOf(0.01)
export const DateSchema   = z.string().date('Data inválida')
export const DateTimeSchema = z.string().datetime('Data/hora inválida')

export const PaginationSchema = z.object({
  page:     z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
})

export const SortSchema = z.object({
  sort_field:     z.string().optional(),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
})

export const IdSchema = z.object({ id: UuidSchema })
export const LeadIdSchema = z.object({ lead_id: UuidSchema })
