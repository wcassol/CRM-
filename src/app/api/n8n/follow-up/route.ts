export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — /api/n8n/follow-up
// Chamado pelo n8n diariamente (workflow 02-follow-up-comercial)
// Retorna leads que precisam de ação de follow-up hoje
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase }       from '@/lib/supabase/server'

function validateN8nKey(req: NextRequest): boolean {
  const key = process.env.N8N_INTERNAL_API_KEY
  if (!key) return true  // desabilitado em dev
  return req.headers.get('x-n8n-api-key') === key
}

export async function GET(req: NextRequest) {
  if (!validateN8nKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const db       = supabase as any
  const hoje     = new Date()

  // Leads que tiveram data_proxima_acao definida para hoje ou antes
  // E que ainda estão no pipeline comercial ativo
  const { data: leadsFollowUp, error: e1 } = await db
    .from('leads')
    .select(`
      id,
      nome,
      telefone,
      email,
      etapa_comercial,
      data_proxima_acao,
      temperatura,
      responsavel_comercial:users!leads_responsavel_comercial_id_fkey(
        id, full_name, email
      )
    `)
    .eq('pipeline_atual', 'comercial')
    .lte('data_proxima_acao', hoje.toISOString())
    .is('deleted_at', null)
    .order('data_proxima_acao', { ascending: true })
    .limit(50)

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  // Leads quentes sem interação há mais de 24h
  const ontemISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: leadsQuentes, error: e2 } = await db
    .from('leads')
    .select(`
      id,
      nome,
      telefone,
      email,
      etapa_comercial,
      temperatura,
      updated_at,
      responsavel_comercial:users!leads_responsavel_comercial_id_fkey(
        id, full_name, email
      )
    `)
    .eq('pipeline_atual', 'comercial')
    .eq('temperatura', 'quente')
    .lt('updated_at', ontemISO)
    .is('deleted_at', null)
    .not('etapa_comercial', 'in', '("proposta_enviada","contrato_enviado")')
    .limit(20)

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  // Propostas enviadas há mais de 3 dias sem resposta
  const tresEDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data: propostasAbertas, error: e3 } = await db
    .from('leads')
    .select(`
      id,
      nome,
      telefone,
      email,
      etapa_comercial,
      updated_at,
      responsavel_comercial:users!leads_responsavel_comercial_id_fkey(
        id, full_name, email
      )
    `)
    .eq('pipeline_atual', 'comercial')
    .eq('etapa_comercial', 'proposta_enviada')
    .lt('updated_at', tresEDiasAtras)
    .is('deleted_at', null)
    .limit(30)

  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 })

  return NextResponse.json({
    gerado_em:        hoje.toISOString(),
    follow_up:        leadsFollowUp    ?? [],
    leads_quentes:    leadsQuentes     ?? [],
    propostas_abertas: propostasAbertas ?? [],
    totais: {
      follow_up:         (leadsFollowUp as any[])?.length    ?? 0,
      leads_quentes:     (leadsQuentes as any[])?.length     ?? 0,
      propostas_abertas: (propostasAbertas as any[])?.length ?? 0,
    },
  })
}
