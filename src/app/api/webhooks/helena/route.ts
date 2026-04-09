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
//     "utm": { "source": "FACEBOOK", "medium": "WHATSAPP API", ... },
//     "customFieldValues": {
//       "cidade": "São Paulo", "uf": "SP",
//       "resumo-gerado-por-ia": "...",
//       "empresa-demandada-46": "99 TECNOLOGIA LTDA",
//       "-tipo-de-contrato-57": "MOTORISTAS POR APP",
//       "honor-rios-de-xito-5": "2.000",
//       "link": "https://meet.google.com/...",
//       "data-e-hora-27": "09/04/2026 14:10",
//       "quem-gerou-a-propost": "KAROL",
//       "entrada": "399"
//     }
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
  event:     z.string().optional(),
  date:      z.string().optional(),
  content:   z.object({
    id:                   z.string().optional(),
    name:                 z.string().optional().nullable(),
    nameWhatsapp:         z.string().optional().nullable(),
    phonenumber:          z.string().optional().nullable(),
    phonenumberFormatted: z.string().optional().nullable(),
    email:                z.string().email().optional().nullable(),
    tags:                 z.array(z.string()).optional().default([]),
    tagsId:               z.array(z.string()).optional(),
    active:               z.boolean().optional(),
    utm: z.object({
      source:      z.string().optional().nullable(),
      medium:      z.string().optional().nullable(),
      campaign:    z.string().optional().nullable(),
      content:     z.string().optional().nullable(),
      headline:    z.string().optional().nullable(),
      referralUrl: z.string().optional().nullable(),
      sourceId:    z.string().optional().nullable(),
      clid:        z.string().optional().nullable(),
      term:        z.string().optional().nullable(),
    }).optional().nullable(),
    customFieldValues: z.record(z.any()).optional(),
  }).optional(),
  // Suporte a payloads "flat"
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
  return raw.replace(/\|/g, '').replace(/\D/g, '')
}

/** Converte "2.000" ou "2,000" para 2000.00 (formato brasileiro) */
function parseBRCurrency(raw: string | null | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

/** Extrai apenas campos não-nulos para usar no update parcial */
function onlyDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ) as Partial<T>
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

  // 5. Extrair dados base do contato
  const c         = body.content ?? body.contact ?? body
  const nome      = (c as any).name || (c as any).nameWhatsapp || null
  const telefone  = normalizarTelefone(
    (c as any).phonenumber ?? (c as any).phone ?? body.phonenumber ?? body.phone ?? null
  )
  const email     = (c as any).email ?? body.email ?? null
  const tags      = (c as any).tags ?? body.tags ?? []
  const contactId = (c as any).id ?? body.id ?? null
  const utm       = (c as any).utm ?? null

  if (!telefone && !nome) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'Contato sem nome ou telefone' })
  }

  // 6. Extrair customFieldValues
  const cf: Record<string, string | null> = (c as any).customFieldValues ?? {}
  const cidade         = cf['cidade'] ?? null
  const estado         = cf['uf'] ?? null
  const resumoCaso     = cf['resumo-gerado-por-ia'] ?? null
  const parteContraria = cf['empresa-demandada-46'] ?? null
  const subtipoCaso    = cf['-tipo-de-contrato-57'] ?? null
  const valorProposto  = parseBRCurrency(cf['honor-rios-de-xito-5'])
  const linkReuniao    = cf['link'] ?? null
  const dataReuniao    = cf['data-e-hora-27'] ?? null
  const quemProposta   = cf['quem-gerou-a-propost'] ?? null
  const entrada        = cf['entrada'] ?? null

  // 7. Extrair UTM
  const utmSource   = utm?.source ?? null
  const utmMedium   = utm?.medium ?? null
  const utmCampaign = utm?.campaign ?? null
  const anuncio     = utm?.content ? (utm.content as string).slice(0, 255) : null
  const landingPage = utm?.referralUrl ?? null

  // 8. Verificar etiquetas configuradas como filtro
  const etiquetasConfiguradas = (config?.etiquetas_lead ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  const tagsLower: string[] = (tags as string[]).map((t: string) => t.toLowerCase())

  if (etiquetasConfiguradas.length > 0) {
    const temEtiquetaLead = etiquetasConfiguradas.some(e => tagsLower.includes(e))
    if (!temEtiquetaLead) {
      return NextResponse.json({
        ok:                   true,
        ignored:              true,
        reason:               `Contato não possui nenhuma das etiquetas configuradas: [${etiquetasConfiguradas.join(', ')}]`,
        tags_recebidas:       tags,
        nome_recebido:        nome,
        telefone_normalizado: telefone,
      })
    }
  }

  // 9. Inferir área jurídica pelas etiquetas
  const AREA_MAP: Record<string, string> = {
    previdenciario: 'previdenciario', previdência: 'previdenciario', previdencia: 'previdenciario',
    trabalhista: 'trabalhista', trabalho: 'trabalhista', clt: 'trabalhista', trabalhista_simples: 'trabalhista',
    consumidor: 'consumidor', 'direito do consumidor': 'consumidor', cdc: 'consumidor',
    civel: 'civel', cível: 'civel', civil: 'civel',
    criminal: 'criminal', penal: 'criminal',
    familia: 'familia', família: 'familia', divorcio: 'familia', divórcio: 'familia',
    tributario: 'tributario', tributário: 'tributario', imposto: 'tributario',
    empresarial: 'empresarial', empresa: 'empresarial',
  }
  const areaDetectada = tagsLower.reduce<string | null>((acc, tag) => acc ?? AREA_MAP[tag] ?? null, null)

  // 10. Montar objeto de campos enriquecidos (compartilhado entre create e update)
  const camposEnriquecidos = {
    email:           email || null,
    area_juridica:   areaDetectada || null,
    utm_source:      utmSource,
    utm_medium:      utmMedium,
    utm_campaign:    utmCampaign,
    anuncio:         anuncio,
    landing_page:    landingPage,
    cidade:          cidade,
    estado:          estado,
    resumo_caso:     resumoCaso,
    parte_contraria: parteContraria,
    subtipo_caso:    subtipoCaso,
    valor_proposto:  valorProposto,
  }

  // 11. Montar texto de interação com dados extras da reunião
  const origemUtm = utmSource
    ? `${utmSource}${utmCampaign ? ` / ${utmCampaign}` : ''}`
    : 'whatsapp'

  function buildInteractionText(prefixo: string): string {
    return [
      prefixo,
      tags.length        ? `Etiquetas: ${(tags as string[]).join(', ')}.`         : '',
      utmSource          ? `Origem: ${origemUtm}.`                                : '',
      anuncio            ? `Anúncio: ${anuncio.slice(0, 80)}...`                  : '',
      parteContraria     ? `Empresa demandada: ${parteContraria}.`                : '',
      subtipoCaso        ? `Tipo de contrato: ${subtipoCaso}.`                    : '',
      dataReuniao        ? `Reunião agendada: ${dataReuniao}.`                    : '',
      linkReuniao        ? `Link: ${linkReuniao}`                                 : '',
      quemProposta       ? `Proposta gerada por: ${quemProposta}.`                : '',
      entrada            ? `Valor de entrada: R$ ${entrada}.`                     : '',
    ].filter(Boolean).join(' ')
  }

  // 12. Verificar se lead já existe (idempotência por telefone)
  if (telefone) {
    const { data: existente } = await db
      .from('leads')
      .select('id, nome')
      .eq('telefone', telefone)
      .is('deleted_at', null)
      .maybeSingle()

    if (existente) {
      // Lead já existe → atualizar campos enriquecidos (apenas os não-nulos)
      const updatePayload = onlyDefined(camposEnriquecidos)

      if (Object.keys(updatePayload).length > 0) {
        await db.from('leads').update(updatePayload).eq('id', existente.id)
      }

      // Registrar interação de atualização
      await db.from('lead_interactions').insert({
        lead_id:    existente.id,
        tipo:       'whatsapp',
        conteudo:   buildInteractionText('Atualização via Helena CRM.'),
        usuario_id: null,
        metadata:   { source: 'helena', event_type: eventType, contact_id: contactId, tags, utm, cf },
      })

      // Audit da atualização
      const auditSvc = new AuditService(supabase)
      await auditSvc.log({
        entity_type: 'lead',
        entity_id:   existente.id,
        action:      'update',
        usuario_id:  null,
        dados_novos: { via: 'webhook', source: 'helena', event_type: eventType, ...updatePayload },
      })

      return NextResponse.json({
        ok:          true,
        atualizado:  true,
        lead_id:     existente.id,
        nome:        existente.nome,
        campos_atualizados: Object.keys(updatePayload),
      })
    }
  }

  // 13. Criar novo lead com todos os campos enriquecidos
  const { data: novoLead, error: createError } = await db
    .from('leads')
    .insert({
      nome:            nome ?? telefone ?? 'Contato Helena',
      telefone:        telefone || null,
      pipeline_atual:  'comercial',
      etapa_comercial: 'novo_lead',
      temperatura:     'morno',
      ...camposEnriquecidos,
    })
    .select('id, nome')
    .single()

  if (createError) {
    console.error('[webhook/helena] Erro ao criar lead:', createError.message)
    return NextResponse.json({ error: 'Erro ao criar lead', details: createError.message }, { status: 500 })
  }

  // 14. Interação inicial
  await db.from('lead_interactions').insert({
    lead_id:    novoLead.id,
    tipo:       'whatsapp',
    conteudo:   buildInteractionText('Lead recebido via Helena CRM.'),
    usuario_id: null,
    metadata:   { source: 'helena', event_type: eventType, contact_id: contactId, tags, utm, cf },
  })

  // 15. Notificar time comercial
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
        mensagem:    `${areaDetectada ? `Área: ${areaDetectada} · ` : ''}${parteContraria ? `vs ${parteContraria} · ` : ''}Etiquetas: ${(tags as string[]).join(', ')}`,
        entity_type: 'lead',
        entity_id:   novoLead.id,
      }
    )
  }

  // 16. Audit
  const auditSvc = new AuditService(supabase)
  await auditSvc.log({
    entity_type: 'lead',
    entity_id:   novoLead.id,
    action:      'create',
    usuario_id:  null,
    dados_novos: { via: 'webhook', source: 'helena', contact_id: contactId, tags, utm, cf },
  })

  return NextResponse.json({
    ok:             true,
    lead_id:        novoLead.id,
    nome:           novoLead.nome,
    atualizado:     false,
    area_detectada: areaDetectada,
  })
}
