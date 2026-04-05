// =============================================================================
// CRM JURÍDICO — WEBHOOK SCHEMAS
// Valida payloads de entrada das integrações externas
// =============================================================================

import { z } from 'zod'

// ─── Entrada de lead via n8n / ZapConnecta ────────────────────────────────────

export const WebhookLeadEntradaSchema = z.object({
  nome:       z.string().min(1).max(200),
  telefone:   z.string().min(8).max(20).transform(v => v.replace(/\D/g, '')),
  email:      z.string().email().optional().nullable(),
  origem:     z.string().max(100).optional(),
  campanha:   z.string().max(200).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),
  area_juridica:   z.string().max(50).optional(),
  resumo_caso:     z.string().max(2000).optional(),
  zap_session_id:  z.string().optional(),
  metadata:        z.record(z.unknown()).optional(),
})

export type WebhookLeadEntradaPayload = z.infer<typeof WebhookLeadEntradaSchema>

// ─── ZapSign Webhook ──────────────────────────────────────────────────────────

export const WebhookZapSignSchema = z.object({
  token:        z.string().min(1),
  status:       z.string(),
  signed_at:    z.string().optional().nullable(),
  signer_name:  z.string().optional().nullable(),
  document_url: z.string().url().optional().nullable(),
})

export type WebhookZapSignPayload = z.infer<typeof WebhookZapSignSchema>

// ─── Asaas Webhook ────────────────────────────────────────────────────────────

export const WebhookAsaasPaymentSchema = z.object({
  event: z.string(),
  payment: z.object({
    id:          z.string(),
    status:      z.string(),
    value:       z.number(),
    netValue:    z.number().optional(),
    paymentDate: z.string().optional().nullable(),
    dueDate:     z.string(),
    invoiceUrl:  z.string().url().optional().nullable(),
    billingType: z.string().optional(),
  }),
})

export type WebhookAsaasPayload = z.infer<typeof WebhookAsaasPaymentSchema>

// ─── Cal.com Webhook ──────────────────────────────────────────────────────────

export const WebhookCalcomSchema = z.object({
  triggerEvent: z.string(),
  payload: z.object({
    uid:       z.string(),
    title:     z.string(),
    startTime: z.string(),
    endTime:   z.string(),
    attendees: z.array(z.object({
      email: z.string().email(),
      name:  z.string(),
      phone: z.string().optional(),
    })),
    organizer: z.object({
      email: z.string().email(),
      name:  z.string(),
    }),
    metadata: z.record(z.unknown()).optional(),
    videoCallData: z.object({
      url:  z.string().url(),
      type: z.string(),
    }).optional().nullable(),
  }),
})

export type WebhookCalcomPayload = z.infer<typeof WebhookCalcomSchema>
