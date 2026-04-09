export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — WEBHOOK: Helena CRM (WhatsApp)
//
// Formato real do payload da Helena:
// {
//   "eventType": "CONTACT_UPDATE" | "CONTACT_CREATE",
//   "date": "2026-04-09T12:44:11Z",
//   "content": {
//     "id": "uuid",
//     "name": "Nome do Contato",
//     "phonenumber": "+55|62992624891",   ← pipe como separador
//     "phonenumberFormatted": "(62) 99262-4891",
//     "email": null,
//     "tags": ["META ADS", "OPORTUNIDADE", "SE"],
//     "tagsId": [...],
//     "active": true,
//     "utm": { ... }
//   }
// }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createAdminSupabase }       from '@/lib/supabase/server'
import { NotificationService }       from '@/server/services/notification.service'
import { AuditService }              from '@/server/services/audit.service'

// Payload normalizado da Helena
const HelenaPayloadSchema = z.object({
  eventType: z.string().optional(),
  event:     z.string().optional(),  // fallback para outros formatos
  date:      z.string().optional(),
  content:   z.object({
    id:                   z.string().optional(),
    name:                 z.string().optional().nullable(),
    nameWhatsapp:         z.string().optional().nullable(),
    phonenumber:          z.string().optional().nullable(),  // +55|62992624891
    phonenumberFormatted: z.string().optional().nullable(),
    email:                z.string().email().optional().nullable(),
    tags:                 z.array(z.string()).optional().default([]),
    tagsId:               z.array(z.string()).optional(),
    active:               z.boolean().optional(),
    utm: z.object({
      source:   z.string().optional().nullable(),
      medium:   z.string().optional().nullable(),
      campaign: z.string().optional().nullable(),
      content:  z.string().optional().nullable(),
    }).optional().nullable(),
    customFieldValues: z.record(z.any()).optional(),
  }).optional(),
  // Suporte a payloads "flat" (contato direto na raiz)
  id:          z.string().optional(),
  name:        z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  phone:       z.string().optional().nullable(),
  email:       z.string().email().optional().nullable(),
  tags:        z.array(z.string()).optional(),
  contact:     z.object({
    id:    z.string().optional(),
    name:  z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    tags:  z.array(z.string()).optional().default([]),
  }).optional(),
})

function normalizarTelefone(raw: string | null | undefined): string {
  if (!raw) return ''
  // Remove o pipe que a Helena usa: "+55|62992624891" → "5562992624891"
  return raw.replace(/\|/g, '').replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase()
  const db       = supabase as any

  // 1. Buscar config da integração
  const { data: integConfig } = await db
    .from('integrations')
    .select('config, ativo')
    .eq('nome', 'zapconnecta')
    .single()

  const config = integConfig?.config as {
    api_key?:        string
    webhook_secret?: string
    etiquetas_lead?: string
  } | null

  // 2. Validar secret (se configurado)
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
  let body: z.infer<typeof HelenaPayloadSchema>
  try {
    const raw = await req.json()
    body = HelenaPayloadSchema.parse(raw)
  } catch (e) {
    return NextResponse.json(
      { error: 'Payload inválido', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }

  // 4. Normalizar tipo do evento
  const eventType = (body.eventType ?? body.event ?? 'CONTACT_UPDATE').toUpperCase()
  const eventosAceitos = ['CONTACT_UPDATE', 'CONTACT_CREATE', 'CONTACT.CREATED', 'CONTACT.UPDATED', 'NEW_CONTACT']
  if (!eventosAceitos.includes(eventType)) {
    return NextResponse.json({ ok: true, ignored: true, reason: `Evento "${eventType}" ignorado` })
  }

  // 5. Extrair dados do contato (suporta payload nested em "content" ou flat)
  const c = body.content ?? body.contact ?? body
  const nome     = c.name || (body as any).nameWhatsapp || null
  const telefone = normalizarTelefone(
    (c as any).phonenumber ?? (c as any).phone ?? body.phonenumber ?? body.phone ?? null
  )
  const email    = (c as any).email ?? body.email ?? null
  const tags     = (c as any).tags ?? body.tags ?? []
  const contactId = (c as any).id ?? body.id ?? null
  const utm       = (c as any).utm ?? null

  if (!telefone && !nome) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'Contato sem nome ou telefone' })
  }

  // 6. Verificar etiquetas configuradas como filtro
  const etiquetasConfiguradas = (config?.etiquetas_lead ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  const tagsLower: string[] = (tags as string[]).map((t: string) => t.toLowerCase())

  if (etiquetasConfiguradas.length > 0) {
    const temEtiquetaLead = etiquetasConfiguradas.some(e => tagsLower.includes(e))
    if (!temEtiquetaLead) {
      return NextResponse.json({
        ok:              true,
        ignored:         true,
        reason:          `Contato não possui nenhuma das etiquetas configuradas: [${etiquetasConfiguradas.join(', ')}]`,
        tags_recebidas:  tags,
        nome_recebido:   nome,
        telefone_normalizado: telefone,
      })
    }
  }

  // 7. Idempotência: verificar duplicata de telefone
  if (telefone) {
    const { data: existente } = await db
      .from('leads')
      .select('id, nome')
      .eq('telefone', telefone)
      .is('deleted_at', null)
      .maybeSingle()

    if (existente) {
      await db.from('lead_interactions').insert({
        lead_id:    existente.id,
        tipo:       'whatsapp',
        conteudo:   `Recontato via Helena CRM. Etiquetas: ${tags.join(', ')}`,
        usuario_id: null,
        metadata:   { source: 'helena', contact_id: contactId, tags, utm },
      })
      return NextResponse.json({ ok: true, recontato: true, lead_id: existente.id, nome: existente.nome })
    }
  }

  // 8. Inferir área jurídica pelas etiquetas
  const AREA_MAP: Record<string, string> = {
    previdenciario: 'previdenciario', previdência: 'previdenciario', previdencia: 'previdenciario',
    trabalhista: 'trabalhista', trabalho: 'trabalhista', clt: 'trabalhista', trabalhista_simples: 'trabalhista',
    consumidor: 'consumidor', 'direito do consumidor': 'consumidor', CDC: 'consumidor',
    civel: 'civel', cível: 'civel', civil: 'civel',
    criminal: 'criminal', penal: 'criminal',
    familia: 'familia', família: 'familia', divorcio: 'familia', divórcio: 'familia',
    tributario: 'tributario', tributário: 'tributario', imposto: 'tributario',
    empresarial: 'empresarial', empresa: 'empresarial',
  }
  const areaDetectada = tagsLower.reduce<string | null>((acc, tag) => acc ?? AREA_MAP[tag] ?? null, null)

  // 9. Inferir origem da UTM
  const origemUtm = utm?.source ? `${utm.source}${utm.campaign ? ` / ${utm.campaign}` : ''}` : 'whatsapp'

  // 10. Criar lead
  const { data: novoLead, error: createError } = await db
    .from('leads')
    .insert({
      nome:            nome ?? telefone ?? 'Contato Helena',
      telefone:        telefone || null,
      email:           email || null,
      area_juridica:   areaDetectada,
      pipeline_atual:  'comercial',
      etapa_comercial: 'novo_lead',
      temperatura:     'morno',
    })
    .select('id, nome')
    .single()

  if (createError) {
    console.error('[webhook/helena] Erro ao criar lead:', createError.message)
    return NextResponse.json({ error: 'Erro ao criar lead', details: createError.message }, { status: 500 })
  }

  // 11. Interação inicial com contexto UTM
  const descricaoInteracao = [
    `Lead recebido via Helena CRM.`,
    tags.length ? `Etiquetas: ${tags.join(', ')}.` : '',
    utm?.source ? `Origem: ${origemUtm}.` : '',
    utm?.content ? `Campanha: ${utm.content.slice(0, 100)}` : '',
  ].filter(Boolean).join(' ')

  await db.from('lead_interactions').insert({
    lead_id:    novoLead.id,
    tipo:       'whatsapp',
    conteudo:   descricaoInteracao,
    usuario_id: null,
    metadata:   { source: 'helena', contact_id: contactId, tags, utm },
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
        mensagem:    `${areaDetectada ? `Área: ${areaDetectada} · ` : ''}Etiquetas: ${tags.join(', ')}`,
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
    dados_novos: { via: 'webhook', source: 'helena', contact_id: contactId, tags, utm },
  })

  return NextResponse.json({
    ok:              true,
    lead_id:         novoLead.id,
    nome:            novoLead.nome,
    recontato:       false,
    area_detectada:  areaDetectada,
  })
}
