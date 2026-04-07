export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — WEBHOOK: Entrada de leads (ZapConnecta / Helena CRM)
//
// Fluxo:
//   ZapConnecta WhatsApp → n8n (normalização) → POST /api/webhooks/lead-entrada
//
// Campos esperados no body:
//   nome, telefone, area_juridica, descricao_caso, origem
//   (+ campos opcionais: email, cpf, urgencia, prazo_sensivel, source_id)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { WebhookService }            from '@/server/services/webhook.service'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'

// Validação do payload recebido
const LeadEntradaSchema = z.object({
  // Identificador externo para idempotência (ex: message_id do WhatsApp)
  external_id:      z.string().min(1),

  // Dados do lead
  nome:             z.string().min(1),
  telefone:         z.string().min(8),
  email:            z.string().email().optional().nullable(),
  cpf:              z.string().optional().nullable(),

  // Qualificação preliminar
  area_juridica:    z.string().optional().nullable(),
  descricao_caso:   z.string().optional().nullable(),
  urgencia:         z.boolean().default(false),
  prazo_sensivel:   z.boolean().default(false),

  // Rastreamento
  source_id:        z.string().uuid().optional().nullable(),
  canal_origem:     z.string().default('whatsapp'),

  // Metadados do n8n
  n8n_execution_id: z.string().optional(),
})

type LeadEntradaInput = z.infer<typeof LeadEntradaSchema>

function validateSecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET_LEAD_ENTRADA
  if (!secret) return true  // sem proteção em dev

  const authHeader = req.headers.get('x-webhook-secret')
  if (!authHeader) return false

  // Comparação em tempo constante
  const crypto = require('crypto') as typeof import('crypto')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(authHeader)
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // 1. Validar autenticação
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsear e validar body
  let input: LeadEntradaInput
  try {
    const body = await req.json()
    input = LeadEntradaSchema.parse(body)
  } catch (e) {
    return NextResponse.json(
      { error: 'Payload inválido', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  const supabase      = createAdminSupabase()
  const webhookSvc    = new WebhookService(supabase)
  const notifySvc     = new NotificationService(supabase)
  const auditSvc      = new AuditService(supabase)

  const idempotencyKey = WebhookService.buildKey('zapconnecta', 'lead_entrada', input.external_id)

  // 3. Idempotência
  const { isNew, queue_id } = await webhookSvc.enqueue({
    source:          'zapconnecta',
    event_type:      'lead_entrada',
    idempotency_key: idempotencyKey,
    payload:         input,
  })

  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true, queue_id })
  }

  try {
    const db = supabase as any

    // 4. Verificar duplicata de telefone no banco
    const telefoneLimpo = input.telefone.replace(/\D/g, '')
    const { data: existente } = await db
      .from('leads')
      .select('id, nome, pipeline_atual')
      .eq('telefone', telefoneLimpo)
      .is('deleted_at', null)
      .maybeSingle()

    if (existente) {
      // Lead já existe — criar interação registrando o novo contato
      await db.from('lead_interactions').insert({
        lead_id:   existente.id,
        tipo:      'whatsapp',
        conteudo:  `Novo contato via WhatsApp. ${input.descricao_caso ?? ''}`.trim(),
        usuario_id: null,
        metadata:  { external_id: input.external_id, canal: input.canal_origem },
      })

      await webhookSvc.markDone(queue_id)
      return NextResponse.json({ ok: true, lead_id: existente.id, recontato: true })
    }

    // 5. Buscar fonte de aquisição padrão para WhatsApp se não fornecida
    let sourceId = input.source_id
    if (!sourceId) {
      const { data: source } = await db
        .from('lead_sources')
        .select('id')
        .ilike('canal', input.canal_origem)
        .limit(1)
        .maybeSingle()
      sourceId = source?.id ?? null
    }

    // 6. Criar o lead
    const { data: novoLead, error: createError } = await db
      .from('leads')
      .insert({
        nome:            input.nome,
        telefone:        telefoneLimpo,
        email:           input.email ?? null,
        cpf:             input.cpf?.replace(/\D/g, '') ?? null,
        area_juridica:   input.area_juridica ?? null,
        descricao_caso:  input.descricao_caso ?? null,
        urgencia:        input.urgencia,
        prazo_sensivel:  input.prazo_sensivel,
        source_id:       sourceId,
        pipeline_atual:  'comercial',
        etapa_comercial: 'novo_lead',
        temperatura:     'morno',
      })
      .select('id, nome')
      .single()

    if (createError) throw new Error(createError.message)

    // 7. Registrar primeira interação com a descrição do caso
    if (input.descricao_caso) {
      await db.from('lead_interactions').insert({
        lead_id:    novoLead.id,
        tipo:       'whatsapp',
        conteudo:   input.descricao_caso,
        usuario_id: null,
        metadata:   { external_id: input.external_id, canal: input.canal_origem },
      })
    }

    // 8. Notificar todos os usuários do time comercial
    const { data: comerciais } = await db
      .from('users')
      .select('id, roles!inner(name)')
      .eq('is_active', true)
      .eq('roles.name', 'comercial')

    if (comerciais?.length) {
      await notifySvc.sendToMany(
        (comerciais as any[]).map((u: any) => u.id),
        {
          tipo:        'novo_lead',
          titulo:      `Novo lead: ${novoLead.nome}`,
          mensagem:    input.descricao_caso
            ? `${input.descricao_caso.slice(0, 100)}${input.descricao_caso.length > 100 ? '...' : ''}`
            : 'Lead recebido via WhatsApp.',
          entity_type: 'lead',
          entity_id:   novoLead.id,
        }
      )
    }

    // 9. Audit
    await auditSvc.log({
      entity_type: 'lead',
      entity_id:   novoLead.id,
      action:      'create',
      usuario_id:  null,
      dados_novos: { via: 'webhook', source: 'zapconnecta', external_id: input.external_id },
    })

    await webhookSvc.markDone(queue_id)

    return NextResponse.json({
      ok:       true,
      lead_id:  novoLead.id,
      nome:     novoLead.nome,
      recontato: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[webhook/lead-entrada] Erro:', msg)
    await webhookSvc.markFailed(queue_id, msg)
    return NextResponse.json({ error: 'Erro interno ao processar lead.' }, { status: 500 })
  }
}
