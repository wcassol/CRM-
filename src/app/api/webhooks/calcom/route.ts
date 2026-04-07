export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — WEBHOOK: Cal.com (agendamento de reuniões)
//
// Fluxo:
//   Cal.com → POST /api/webhooks/calcom
//
// Eventos tratados:
//   - BOOKING_CREATED      → criar appointment + avançar etapa do lead
//   - BOOKING_RESCHEDULED  → atualizar data/hora da reunião
//   - BOOKING_CANCELLED    → marcar reunião como cancelada
//   - MEETING_ENDED        → registrar reunião como realizada
//
// Segurança: HMAC-SHA256 no header X-Cal-Signature-256
//
// IMPORTANTE: o lead_id deve ser passado como campo customizado da reserva
// (responses.lead_id.value) ou como parte do título do evento.
// Configure no Cal.com: Event Type → Booking Questions → add "lead_id" field.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { WebhookService }            from '@/server/services/webhook.service'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'
import { CalcomClient }              from '@/server/integrations/calcom.client'

const CalcomWebhookSchema = z.object({
  triggerEvent: z.enum([
    'BOOKING_CREATED',
    'BOOKING_RESCHEDULED',
    'BOOKING_CANCELLED',
    'MEETING_ENDED',
  ]),
  createdAt: z.string(),
  payload:   z.object({
    uid:        z.string(),
    title:      z.string(),
    startTime:  z.string(),
    endTime:    z.string(),
    status:     z.string(),
    meetingUrl: z.string().optional().nullable(),
    attendees:  z.array(z.object({
      name:     z.string(),
      email:    z.string(),
      timeZone: z.string().optional(),
    })).default([]),
    organizer:  z.object({
      name:  z.string(),
      email: z.string(),
    }).optional(),
    responses: z.record(z.object({
      label: z.string(),
      value: z.union([z.string(), z.array(z.string())]),
    })).optional().nullable(),
    rescheduleUid: z.string().optional().nullable(),
    cancellationReason: z.string().optional().nullable(),
  }),
})

type CalcomWebhook = z.infer<typeof CalcomWebhookSchema>

/** Extrai o lead_id do campo customizado "lead_id" nas respostas do Cal.com */
function extractLeadId(responses?: Record<string, { label: string; value: string | string[] }> | null): string | null {
  if (!responses) return null
  const field = responses['lead_id'] ?? responses['leadId'] ?? responses['crm_lead_id']
  if (!field) return null
  const val = Array.isArray(field.value) ? field.value[0] : field.value
  // Validar UUID básico
  return /^[0-9a-f-]{36}$/i.test(val ?? '') ? val ?? null : null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // 1. Validar assinatura HMAC
  const signature = req.headers.get('x-cal-signature-256') ?? ''
  const secret    = process.env.CALCOM_WEBHOOK_SECRET ?? ''

  if (secret && !CalcomClient.validateWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  // 2. Parsear payload
  let input: CalcomWebhook
  try {
    input = CalcomWebhookSchema.parse(JSON.parse(rawBody))
  } catch (e) {
    return NextResponse.json(
      { error: 'Payload inválido', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  const supabase   = createAdminSupabase()
  const webhookSvc = new WebhookService(supabase)
  const notifySvc  = new NotificationService(supabase)
  const auditSvc   = new AuditService(supabase)

  const idempotencyKey = WebhookService.buildKey(
    'calcom',
    input.triggerEvent,
    `${input.payload.uid}:${input.createdAt}`
  )

  // 3. Idempotência
  const { isNew, queue_id } = await webhookSvc.enqueue({
    source:          'calcom',
    event_type:      input.triggerEvent,
    idempotency_key: idempotencyKey,
    payload:         input,
  })

  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    const db        = supabase as any
    const booking   = input.payload
    const leadId    = extractLeadId(booking.responses)
    const attendee  = booking.attendees[0]

    switch (input.triggerEvent) {
      case 'BOOKING_CREATED': {
        // Se não temos lead_id no campo customizado, tentar encontrar pelo e-mail do attendee
        let resolvedLeadId = leadId

        if (!resolvedLeadId && attendee?.email) {
          const { data: lead } = await db
            .from('leads')
            .select('id')
            .eq('email', attendee.email)
            .is('deleted_at', null)
            .maybeSingle()
          resolvedLeadId = lead?.id ?? null
        }

        if (!resolvedLeadId) {
          // Sem lead_id — criar appointment sem vínculo (será vinculado manualmente)
          await db.from('appointments').insert({
            lead_id:        null as any,  // tabela pode aceitar NULL temporariamente
            calcom_uid:     booking.uid,
            titulo:         booking.title,
            data_hora:      booking.startTime,
            data_hora_fim:  booking.endTime,
            link_meet:      booking.meetingUrl ?? null,
            status:         'agendada',
            participante_nome:  attendee?.name ?? null,
            participante_email: attendee?.email ?? null,
            criado_por:     null,
          })
          await webhookSvc.markDone(queue_id)
          return NextResponse.json({ ok: true, note: 'lead_id não encontrado — reunião sem vínculo' })
        }

        // Criar appointment vinculado ao lead
        const { data: appt } = await db
          .from('appointments')
          .insert({
            lead_id:            resolvedLeadId,
            calcom_uid:         booking.uid,
            titulo:             booking.title,
            data_hora:          booking.startTime,
            data_hora_fim:      booking.endTime,
            link_meet:          booking.meetingUrl ?? null,
            status:             'agendada',
            participante_nome:  attendee?.name ?? null,
            participante_email: attendee?.email ?? null,
            criado_por:         null,
          })
          .select('id')
          .single()

        // Avançar etapa do lead para reuniao_agendada (se ainda não avançou)
        await db
          .from('leads')
          .update({ etapa_comercial: 'reuniao_agendada' })
          .eq('id', resolvedLeadId)
          .in('etapa_comercial', ['novo_lead', 'triagem_concluida', 'aguardando_documentos', 'em_analise_viabilidade'])

        // Registrar na timeline
        await db.from('lead_interactions').insert({
          lead_id:    resolvedLeadId,
          tipo:       'reuniao',
          conteudo:   `Reunião agendada para ${new Date(booking.startTime).toLocaleString('pt-BR')}. ${booking.meetingUrl ? `Link: ${booking.meetingUrl}` : ''}`,
          usuario_id: null,
          metadata:   { calcom_uid: booking.uid, appointment_id: appt?.id },
        })

        // Notificar responsável
        const { data: lead } = await db
          .from('leads')
          .select('nome, responsavel_comercial_id')
          .eq('id', resolvedLeadId)
          .single()

        if (lead?.responsavel_comercial_id) {
          await notifySvc.send({
            usuario_id:  lead.responsavel_comercial_id,
            tipo:        'reuniao_agendada',
            titulo:      `Reunião agendada: ${lead.nome}`,
            mensagem:    `${new Date(booking.startTime).toLocaleString('pt-BR')} — ${booking.meetingUrl ?? 'Sem link de reunião'}`,
            entity_type: 'lead',
            entity_id:   resolvedLeadId,
          })
        }

        await auditSvc.log({
          entity_type: 'lead',
          entity_id:   resolvedLeadId,
          action:      'update',
          usuario_id:  null,
          dados_novos: { reuniao_agendada: true, calcom_uid: booking.uid },
        })
        break
      }

      case 'BOOKING_RESCHEDULED': {
        // Atualizar data/hora da reunião
        const { data: appt } = await db
          .from('appointments')
          .update({
            data_hora:     booking.startTime,
            data_hora_fim: booking.endTime,
            link_meet:     booking.meetingUrl ?? null,
          })
          .eq('calcom_uid', booking.uid)
          .select('lead_id')
          .maybeSingle()

        if (appt?.lead_id) {
          await db.from('lead_interactions').insert({
            lead_id:    appt.lead_id,
            tipo:       'sistema',
            conteudo:   `Reunião reagendada para ${new Date(booking.startTime).toLocaleString('pt-BR')}.`,
            usuario_id: null,
            metadata:   { calcom_uid: booking.uid, reschedule_uid: booking.rescheduleUid },
          })
        }
        break
      }

      case 'BOOKING_CANCELLED': {
        const { data: appt } = await db
          .from('appointments')
          .update({ status: 'cancelada' })
          .eq('calcom_uid', booking.uid)
          .select('lead_id')
          .maybeSingle()

        if (appt?.lead_id) {
          await db.from('lead_interactions').insert({
            lead_id:    appt.lead_id,
            tipo:       'sistema',
            conteudo:   `Reunião cancelada.${booking.cancellationReason ? ` Motivo: ${booking.cancellationReason}` : ''}`,
            usuario_id: null,
            metadata:   { calcom_uid: booking.uid },
          })

          // Notificar responsável
          const { data: lead } = await db
            .from('leads')
            .select('nome, responsavel_comercial_id')
            .eq('id', appt.lead_id)
            .single()

          if (lead?.responsavel_comercial_id) {
            await notifySvc.send({
              usuario_id:  lead.responsavel_comercial_id,
              tipo:        'reuniao_cancelada',
              titulo:      `Reunião cancelada: ${lead.nome}`,
              mensagem:    booking.cancellationReason ?? 'Reunião cancelada pelo participante.',
              entity_type: 'lead',
              entity_id:   appt.lead_id,
            })
          }
        }
        break
      }

      case 'MEETING_ENDED': {
        // Reunião encerrada — marcar como realizada e avançar etapa
        const { data: appt } = await db
          .from('appointments')
          .update({ status: 'realizada' })
          .eq('calcom_uid', booking.uid)
          .select('lead_id')
          .maybeSingle()

        if (appt?.lead_id) {
          // Avançar etapa para reuniao_realizada
          await db
            .from('leads')
            .update({ etapa_comercial: 'reuniao_realizada' })
            .eq('id', appt.lead_id)
            .eq('etapa_comercial', 'reuniao_agendada')

          await db.from('lead_interactions').insert({
            lead_id:    appt.lead_id,
            tipo:       'reuniao',
            conteudo:   `Reunião encerrada (Cal.com). Duração: ${Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)} minutos.`,
            usuario_id: null,
            metadata:   { calcom_uid: booking.uid },
          })
        }
        break
      }
    }

    await webhookSvc.markDone(queue_id)
    return NextResponse.json({ ok: true, event: input.triggerEvent })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[webhook/calcom] Erro:', msg)
    await webhookSvc.markFailed(queue_id, msg)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
