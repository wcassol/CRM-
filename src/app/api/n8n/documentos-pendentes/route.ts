export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — /api/n8n/documentos-pendentes
// Chamado pelo n8n diariamente (workflow 06-documentos-lembrete)
// Retorna leads com documentos pendentes para envio de lembrete
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase }       from '@/lib/supabase/server'

function validateN8nKey(req: NextRequest): boolean {
  const key = process.env.N8N_INTERNAL_API_KEY
  if (!key) return true
  return req.headers.get('x-n8n-api-key') === key
}

export async function GET(req: NextRequest) {
  if (!validateN8nKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()

  // Leads no pipeline comercial com documentos pendentes
  // etapa: aguardando_documentos ou triagem_concluida
  // Não contatados nos últimos 2 dias
  const doisDiasAtras = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('leads')
    .select(`
      id,
      nome,
      telefone,
      email,
      area_juridica,
      etapa_comercial,
      updated_at,
      responsavel_comercial:users!leads_responsavel_comercial_id_fkey(
        id, full_name, email
      )
    `)
    .eq('pipeline_atual', 'comercial')
    .in('etapa_comercial', ['triagem_concluida', 'aguardando_documentos'])
    .lt('updated_at', doisDiasAtras)
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Para cada lead, buscar quais documentos estão pendentes
  const resultado = await Promise.all(
    ((data ?? []) as any[]).map(async (lead: any) => {
      const { data: docs } = await supabase
        .from('lead_documents')
        .select('nome, obrigatorio, status')
        .eq('lead_id', lead.id)
        .neq('status', 'aprovado')

      const pendentes = (docs ?? []).filter((d: any) => d.status !== 'aprovado')
      const obrigatoriosFaltando = pendentes.filter((d: any) => d.obrigatorio)

      return {
        ...lead,
        documentos_pendentes:    pendentes,
        obrigatorios_faltando:   obrigatoriosFaltando.length,
        dias_sem_atualizacao:    Math.floor(
          (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    })
  )

  // Filtrar apenas os que têm obrigatórios faltando
  const comObrigatorios = resultado.filter((l: any) => l.obrigatorios_faltando > 0)

  return NextResponse.json({
    gerado_em:    new Date().toISOString(),
    leads:        comObrigatorios,
    total:        comObrigatorios.length,
  })
}
