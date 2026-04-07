export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — WEBHOOK: Asaas (cobranças e pagamentos)
//
// Fluxo:
//   Asaas → POST /api/webhooks/asaas
//
// Eventos tratados:
//   - PAYMENT_RECEIVED    → pagamento confirmado → RN-05: libera onboarding
//   - PAYMENT_OVERDUE     → cobrança vencida → notifica financeiro
//   - PAYMENT_DELETED     → cobrança removida → atualiza status
//   - PAYMENT_REFUNDED    → estorno → atualiza status
//
// Segurança: token fixo no header Authorization (configurado em ASAAS_WEBHOOK_TOKEN)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { WebhookService }            from '@/server/services/webhook.service'
import { PipelineService }           from '@/server/services/pipeline.service'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'
import { AsaasClient }               from '@/server/integrations/asaas.client'

const AsaasWebhookSchema = z.object({
  event:   z.string(),
  payment: z.object({
    id:          z.string(),
    status:      z.string(),
    value:       z.number(),
    dueDate:     z.string(),
    paymentDate: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    invoiceUrl:  z.string().optional().nullable(),
    customer:    z.string(),
    externalReference: z.string().optional().nullable(),  // lead_id ou charge_id
  }),
})

type AsaasWebhookPayload = z.infer<typeof AsaasWebhookSchema>

// Status Asaas → status interno do CRM
const STATUS_MAP: Record<string, string> = {
  RECEIVED:       'pago',
  CONFIRMED:      'pago',
  OVERDUE:        'atrasado',
  REFUNDED:       'estornado',
  DELETED:        'cancelado',
  AWAITING_RISK_ANALYSIS: 'pendente',
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // 1. Validar token de acesso do webhook Asaas
  const authHeader = req.headers.get('asaas-access-token') ?? ''
  if (!AsaasClient.validateWebhookToken(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsear payload
  let input: AsaasWebhookPayload
  try {
    input = AsaasWebhookSchema.parse(JSON.parse(rawBody))
  } catch (e) {
    return NextResponse.json(
      { error: 'Payload inválido', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  const supabase    = createAdminSupabase()
  const webhookSvc  = new WebhookService(supabase)
  const pipeSvc     = new PipelineService(supabase)
  const notifySvc   = new NotificationService(supabase)
  const auditSvc    = new AuditService(supabase)

  const idempotencyKey = WebhookService.buildKey('asaas', input.event, input.payment.id)

  // 3. Idempotência
  const { isNew, queue_id } = await webhookSvc.enqueue({
    source:          'asaas',
    event_type:      input.event,
    idempotency_key: idempotencyKey,
    payload:         input,
  })

  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    const db = supabase as any

    // 4. Buscar cobrança pelo asaas_id
    const { data: chargeRaw } = await db
      .from('charges')
      .select('id, lead_id, status, valor')
      .eq('asaas_id', input.payment.id)
      .maybeSingle()
    const charge = chargeRaw as any

    // Se não encontrar pelo asaas_id, tentar pelo externalReference (lead_id)
    let leadId: string | null = charge?.lead_id ?? input.payment.externalReference ?? null
    let chargeId: string | null = charge?.id ?? null

    if (!leadId) {
      await webhookSvc.markDone(queue_id)
      return NextResponse.json({ ok: true, note: 'Cobrança não encontrada — ignorado' })
    }

    const novoStatus = STATUS_MAP[input.event.replace('PAYMENT_', '')] ?? 'pendente'

    // 5. Atualizar status da cobrança
    if (chargeId) {
      const updateData: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === 'pago' && input.payment.paymentDate) {
        updateData.pago_em = input.payment.paymentDate
      }

      await db
        .from('charges')
        .update(updateData)
        .eq('id', chargeId)
    }

    // 6. Tratar por tipo de evento
    switch (input.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        // RN-05: Pagamento confirmado → registrar na timeline
        await db.from('lead_interactions').insert({
          lead_id:    leadId,
          tipo:       'sistema',
          conteudo:   `Pagamento confirmado via Asaas. Valor: R$ ${input.payment.value.toFixed(2)}`,
          usuario_id: null,
          metadata:   {
            asaas_id:     input.payment.id,
            valor:        input.payment.value,
            payment_date: input.payment.paymentDate,
          },
        })

        // Verificar se é o pagamento de honorários (permite onboarding — RN-05)
        // A trigger do banco `enforce_onboarding_after_payment` já verifica isso.
        // Aqui apenas avançamos a etapa.
        const { data: lead } = await db
          .from('leads')
          .select('etapa_comercial, pipeline_atual, responsavel_comercial_id, responsavel_juridico_id, nome')
          .eq('id', leadId)
          .single()

        if (lead?.etapa_comercial === 'pagamento_pendente' && lead.pipeline_atual === 'comercial') {
          // Avançar para onboarding
          await pipeSvc.moveStage({
            lead_id:    leadId,
            pipeline:   'onboarding',
            etapa_nova: 'pagamento_confirmado',
            usuario_id: 'system',  // ação automática
          })
        }

        // Notificar responsável comercial
        if (lead?.responsavel_comercial_id) {
          await notifySvc.send({
            usuario_id:  lead.responsavel_comercial_id,
            tipo:        'pagamento_confirmado',
            titulo:      `Pagamento confirmado: ${lead?.nome ?? 'Cliente'}`,
            mensagem:    `R$ ${input.payment.value.toFixed(2)} confirmado. Cliente aguarda onboarding.`,
            entity_type: 'lead',
            entity_id:   leadId,
          })
        }

        await auditSvc.log({
          entity_type: 'lead',
          entity_id:   leadId,
          action:      'update',
          usuario_id:  null,
          dados_novos: { pagamento_confirmado: true, asaas_id: input.payment.id, valor: input.payment.value },
        })
        break
      }

      case 'PAYMENT_OVERDUE': {
        // Cobrança vencida — notificar financeiro
        await db.from('lead_interactions').insert({
          lead_id:    leadId,
          tipo:       'sistema',
          conteudo:   `Cobrança vencida em ${input.payment.dueDate}. Valor: R$ ${input.payment.value.toFixed(2)}`,
          usuario_id: null,
          metadata:   { asaas_id: input.payment.id, due_date: input.payment.dueDate },
        })

        const { data: financeirosRaw } = await db
          .from('users')
          .select('id, roles!inner(name)')
          .eq('is_active', true)
          .eq('roles.name', 'financeiro')
        const financeiros = financeirosRaw as any[]

        if (financeiros?.length) {
          const { data: leadNome } = await db
            .from('leads')
            .select('nome')
            .eq('id', leadId)
            .single()

          await notifySvc.sendToMany(
            financeiros.map((u: any) => u.id),
            {
              tipo:        'cobranca_vencida',
              titulo:      `Cobrança vencida: ${leadNome?.nome ?? 'Cliente'}`,
              mensagem:    `Valor: R$ ${input.payment.value.toFixed(2)} — venceu em ${input.payment.dueDate}`,
              entity_type: 'lead',
              entity_id:   leadId,
            }
          )
        }
        break
      }

      case 'PAYMENT_REFUNDED': {
        await db.from('lead_interactions').insert({
          lead_id:    leadId,
          tipo:       'sistema',
          conteudo:   `Pagamento estornado. Valor: R$ ${input.payment.value.toFixed(2)}`,
          usuario_id: null,
          metadata:   { asaas_id: input.payment.id },
        })
        break
      }

      default:
        // Outros eventos (ex: PAYMENT_DELETED) — só atualiza status, já feito acima
        break
    }

    await webhookSvc.markDone(queue_id)
    return NextResponse.json({ ok: true, event: input.event, lead_id: leadId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[webhook/asaas] Erro:', msg)
    await webhookSvc.markFailed(queue_id, msg)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
