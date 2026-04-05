// =============================================================================
// CRM JURÍDICO — WEBHOOK: ZapSign (assinatura de contratos)
//
// Fluxo:
//   ZapSign → POST /api/webhooks/zapsign
//
// Eventos tratados:
//   - doc_signed      → contrato assinado por TODOS os signatários → avança etapa
//   - signer_signed   → um signatário assinou (registro na timeline)
//   - doc_refused     → recusa de assinatura → notifica comercial
//
// Segurança: HMAC-SHA256 no header X-Zapsign-Hmac-Sha256
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { WebhookService }            from '@/server/services/webhook.service'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'
import { ZapSignClient }             from '@/server/integrations/zapsign.client'

const ZapSignPayloadSchema = z.object({
  event_type:   z.enum(['doc_signed', 'signer_signed', 'doc_refused', 'doc_deleted']),
  document:     z.object({
    token:        z.string(),
    name:         z.string(),
    status:       z.string(),
    external_id:  z.string().optional().nullable(),  // lead_id gravado na criação
    signed_at:    z.string().optional().nullable(),
  }),
  signer:       z.object({
    token:        z.string(),
    name:         z.string().optional(),
    email:        z.string().optional().nullable(),
    status:       z.string(),
    signed_at:    z.string().optional().nullable(),
  }).optional(),
})

type ZapSignPayload = z.infer<typeof ZapSignPayloadSchema>

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // 1. Validar assinatura HMAC
  const signature = req.headers.get('x-zapsign-hmac-sha256') ?? ''
  const secret    = process.env.ZAPSIGN_WEBHOOK_SECRET ?? ''

  if (secret && !ZapSignClient.validateWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  // 2. Parsear payload
  let input: ZapSignPayload
  try {
    input = ZapSignPayloadSchema.parse(JSON.parse(rawBody))
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
    'zapsign',
    input.event_type,
    `${input.document.token}:${input.signer?.token ?? 'all'}`
  )

  // 3. Idempotência
  const { isNew, queue_id } = await webhookSvc.enqueue({
    source:          'zapsign',
    event_type:      input.event_type,
    idempotency_key: idempotencyKey,
    payload:         input,
  })

  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    // 4. Buscar contrato pelo token ZapSign
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, lead_id, status, proposal_id')
      .eq('zapsign_token', input.document.token)
      .maybeSingle()

    if (!contract) {
      // Token não encontrado — ignora silenciosamente (pode ser ambiente diferente)
      await webhookSvc.markDone(queue_id)
      return NextResponse.json({ ok: true, note: 'Contrato não encontrado' })
    }

    const leadId = contract.lead_id

    // 5. Tratar por tipo de evento
    switch (input.event_type) {
      case 'signer_signed': {
        // Um signatário assinou — registrar na timeline
        await supabase.from('lead_interactions').insert({
          lead_id:   leadId,
          tipo:      'sistema',
          conteudo:  `${input.signer?.name ?? 'Signatário'} assinou o contrato no ZapSign.`,
          usuario_id: null,
          metadata:  { zapsign_token: input.document.token, signer_token: input.signer?.token },
        })
        break
      }

      case 'doc_signed': {
        // Todos assinaram — atualizar contrato e avançar etapa
        await supabase
          .from('contracts')
          .update({
            status:     'assinado',
            assinado_em: input.document.signed_at ?? new Date().toISOString(),
          })
          .eq('id', contract.id)

        // Avança etapa do lead para pagamento_pendente
        await supabase
          .from('leads')
          .update({ etapa_comercial: 'pagamento_pendente' })
          .eq('id', leadId)
          .eq('etapa_comercial', 'contrato_enviado')

        // Registrar na timeline
        await supabase.from('lead_interactions').insert({
          lead_id:    leadId,
          tipo:       'sistema',
          conteudo:   'Contrato assinado digitalmente via ZapSign.',
          usuario_id: null,
          metadata:   { zapsign_token: input.document.token, signed_at: input.document.signed_at },
        })

        // Notificar responsável comercial
        const { data: lead } = await supabase
          .from('leads')
          .select('nome, responsavel_comercial_id')
          .eq('id', leadId)
          .single()

        if (lead?.responsavel_comercial_id) {
          await notifySvc.send({
            usuario_id:  lead.responsavel_comercial_id,
            tipo:        'contrato_assinado',
            titulo:      `Contrato assinado: ${lead.nome}`,
            mensagem:    'O contrato foi assinado por todos os signatários. Aguarde confirmação do pagamento.',
            entity_type: 'lead',
            entity_id:   leadId,
          })
        }

        await auditSvc.log({
          entity_type: 'lead',
          entity_id:   leadId,
          action:      'update',
          usuario_id:  null,
          dados_novos: { contrato_assinado: true, via: 'webhook_zapsign' },
        })
        break
      }

      case 'doc_refused': {
        // Contrato recusado — notificar e registrar
        await supabase
          .from('contracts')
          .update({ status: 'recusado' })
          .eq('id', contract.id)

        await supabase.from('lead_interactions').insert({
          lead_id:    leadId,
          tipo:       'sistema',
          conteudo:   `Assinatura recusada por ${input.signer?.name ?? 'signatário'}.`,
          usuario_id: null,
          metadata:   { zapsign_token: input.document.token },
        })

        const { data: lead } = await supabase
          .from('leads')
          .select('nome, responsavel_comercial_id')
          .eq('id', leadId)
          .single()

        if (lead?.responsavel_comercial_id) {
          await notifySvc.send({
            usuario_id:  lead.responsavel_comercial_id,
            tipo:        'contrato_recusado',
            titulo:      `Contrato recusado: ${lead.nome}`,
            mensagem:    `${input.signer?.name ?? 'Um signatário'} recusou a assinatura do contrato.`,
            entity_type: 'lead',
            entity_id:   leadId,
          })
        }
        break
      }

      default:
        // Evento desconhecido — registrar e ignorar
        break
    }

    await webhookSvc.markDone(queue_id)
    return NextResponse.json({ ok: true, event: input.event_type, lead_id: leadId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[webhook/zapsign] Erro:', msg)
    await webhookSvc.markFailed(queue_id, msg)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
