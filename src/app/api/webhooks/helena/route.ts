export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — WEBHOOK: Helena CRM (WhatsApp)
//
// Configuração na Helena:
//   Configurações → Integrações → Web hooks
//   URL: https://crm.zapconnecta.com/api/webhooks/helena
//   Eventos: contact.created, contact.updated
//
// Fluxo:
//   Helena detecta novo contato →  dispara webhook
//   CRM verifica se o contato tem alguma etiqueta configurada como "lead"
//   Se sim: cria o lead automaticamente
//   Se não: ignora (retorna 200 OK)
//
// Payload esperado da Helena (contact.created):
//   {
//     "event": "contact.created",
//     "contact": {
//       "id": "abc123",
//       "name": "Nome do Cliente",
//       "phone": "+5584981210774",
//       "email": "cliente@email.com",
//       "tags": ["lead", "consumidor"]
//     },
//     "channel": "whatsapp",
//     "timestamp": "2026-04-09T10:00:00Z"
//   }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'

// Payload da Helena (aceita ambos os formatos: contact.created e message.received)
const HelenaContactSchema = z.object({
  id:    z.string(),
  name:  z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  tags:  z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional(),
})

const HelenaWebhookSchema = z.object({
  event:   z.string().default('contact.created'),
  contact: HelenaContactSchema.optional(),
  // Alguns formatos Helena enviam direto o contato na raiz
  id:      z.string().optional(),
  name:    z.string().optional().nullable(),
  phone:   z.string().optional().nullable(),
  email:   z.string().email().optional().nullable(),
  tags:    z.array(z.string()).optional(),
  channel: z.string().optional(),
  timestamp: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase()
  const db       = supabase as any

  // 1. Buscar configuração da integração Helena no banco
  const { data: integConfig } = await db
    .from('integrations')
    .select('config, ativo')
    .eq('nome', 'zapconnecta')
    .single()

  const config = integConfig?.config as {
    api_key?:        string
    webhook_secret?: string
    etiquetas_lead?: string  // ex: "lead,juridico,prospect" (separado por vírgula)
  } | null

  // 2. Validar secret (opcional — se configurado)
  if (config?.webhook_secret) {
    const receivedSecret =
      req.headers.get('x-helena-secret') ||
      req.headers.get('x-webhook-secret') ||
      req.headers.get('authorization')?.replace('Bearer ', '')

    if (!receivedSecret || receivedSecret !== config.webhook_secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 3. Parsear body
  let body: z.infer<typeof HelenaWebhookSchema>
  try {
    const raw = await req.json()
    body = HelenaWebhookSchema.parse(raw)
  } catch (e) {
    return NextResponse.json(
      { error: 'Payload inválido', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  // 4. Ignorar eventos que não sejam de contato
  const evento = body.event ?? 'contact.created'
  if (!['contact.created', 'contact.updated', 'new_contact'].includes(evento)) {
    return NextResponse.json({ ok: true, ignored: true, reason: `Evento "${evento}" ignorado` })
  }

  // 5. Normalizar contato (suporta payload aninhado ou na raiz)
  const contato = body.contact ?? {
    id:    body.id ?? '',
    name:  body.name,
    phone: body.phone,
    email: body.email,
    tags:  body.tags ?? [],
  }

  if (!contato.phone && !contato.name) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'Contato sem nome ou telefone' })
  }

  // 6. Verificar etiquetas configuradas como filtro de lead
  const etiquetasConfiguradas = (config?.etiquetas_lead ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (etiquetasConfiguradas.length > 0) {
    const tagsDoContato = (contato.tags ?? []).map(t => t.toLowerCase())
    const temEtiquetaLead = etiquetasConfiguradas.some(e => tagsDoContato.includes(e))

    if (!temEtiquetaLead) {
      return NextResponse.json({
        ok:      true,
        ignored: true,
        reason:  `Contato não possui nenhuma das etiquetas configuradas: [${etiquetasConfiguradas.join(', ')}]`,
        tags_recebidas: tagsDoContato,
      })
    }
  }

  // 7. Normalizar telefone
  const telefoneLimpo = (contato.phone ?? '').replace(/\D/g, '')

  // 8. Verificar se lead já existe (idempotência por telefone)
  if (telefoneLimpo) {
    const { data: existente } = await db
      .from('leads')
      .select('id, nome')
      .eq('telefone', telefoneLimpo)
      .is('deleted_at', null)
      .maybeSingle()

    if (existente) {
      // Registrar recontato como interação
      await db.from('lead_interactions').insert({
        lead_id:    existente.id,
        tipo:       'whatsapp',
        conteudo:   `Recontato via Helena CRM. Etiquetas: ${(contato.tags ?? []).join(', ')}`,
        usuario_id: null,
        metadata:   { source: 'helena', contact_id: contato.id, tags: contato.tags },
      })

      return NextResponse.json({
        ok:        true,
        recontato: true,
        lead_id:   existente.id,
        nome:      existente.nome,
      })
    }
  }

  // 9. Inferir área jurídica pelas etiquetas
  const AREA_MAP: Record<string, string> = {
    previdenciario: 'previdenciario', previdência: 'previdenciario',
    trabalhista: 'trabalhista', trabalho: 'trabalhista', clt: 'trabalhista',
    consumidor: 'consumidor', 'direito do consumidor': 'consumidor',
    civel: 'civel', cível: 'civel', civil: 'civel',
    criminal: 'criminal', penal: 'criminal',
    familia: 'familia', família: 'familia', divórcio: 'familia',
    tributario: 'tributario', tributário: 'tributario', imposto: 'tributario',
    empresarial: 'empresarial', empresa: 'empresarial',
  }

  const tagsLower = (contato.tags ?? []).map(t => t.toLowerCase())
  const areaDetectada = tagsLower.reduce<string | null>((acc, tag) => {
    return acc ?? AREA_MAP[tag] ?? null
  }, null)

  // 10. Criar o lead
  const { data: novoLead, error: createError } = await db
    .from('leads')
    .insert({
      nome:            contato.name ?? contato.phone ?? 'Contato Helena',
      telefone:        telefoneLimpo || null,
      email:           contato.email ?? null,
      area_juridica:   areaDetectada,
      pipeline_atual:  'comercial',
      etapa_comercial: 'novo_lead',
      temperatura:     'morno',
      canal_origem:    'whatsapp',
    })
    .select('id, nome')
    .single()

  if (createError) {
    console.error('[webhook/helena] Erro ao criar lead:', createError.message)
    return NextResponse.json({ error: 'Erro ao criar lead', details: createError.message }, { status: 500 })
  }

  // 11. Registrar interação inicial com as etiquetas
  await db.from('lead_interactions').insert({
    lead_id:    novoLead.id,
    tipo:       'whatsapp',
    conteudo:   `Lead recebido via Helena CRM. Etiquetas: ${(contato.tags ?? []).join(', ')}`,
    usuario_id: null,
    metadata:   { source: 'helena', contact_id: contato.id, tags: contato.tags, channel: body.channel },
  })

  // 12. Notificar time comercial
  const notifySvc = new NotificationService(supabase)
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
        titulo:      `Novo lead via WhatsApp: ${novoLead.nome}`,
        mensagem:    `Chegou pelo Helena CRM${areaDetectada ? ` · ${areaDetectada}` : ''} · Etiquetas: ${(contato.tags ?? []).join(', ')}`,
        entity_type: 'lead',
        entity_id:   novoLead.id,
      }
    )
  }

  // 13. Audit
  const auditSvc = new AuditService(supabase)
  await auditSvc.log({
    entity_type: 'lead',
    entity_id:   novoLead.id,
    action:      'create',
    usuario_id:  null,
    dados_novos: { via: 'webhook', source: 'helena', contact_id: contato.id, tags: contato.tags },
  })

  return NextResponse.json({
    ok:      true,
    lead_id: novoLead.id,
    nome:    novoLead.nome,
    recontato: false,
    area_detectada: areaDetectada,
  })
}
