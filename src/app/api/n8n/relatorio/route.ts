export const dynamic = 'force-dynamic'

// =============================================================================
// CRM JURÍDICO — /api/n8n/relatorio
// Chamado pelo n8n toda segunda-feira às 8h (workflow 09-relatorio-semanal)
// Retorna métricas consolidadas da semana anterior para envio de relatório
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

  // Janela: semana anterior (segunda a domingo)
  const agora       = new Date()
  const diaSemana   = agora.getDay()                         // 0=dom, 1=seg, ...
  const diasAteLast = diaSemana === 0 ? 7 : diaSemana        // dias desde a última segunda
  const fimSemana   = new Date(agora)
  fimSemana.setDate(agora.getDate() - (diaSemana === 0 ? 0 : diaSemana))
  fimSemana.setHours(23, 59, 59, 999)

  const inicioSemana = new Date(fimSemana)
  inicioSemana.setDate(fimSemana.getDate() - 6)
  inicioSemana.setHours(0, 0, 0, 0)

  const ini = inicioSemana.toISOString()
  const fim = fimSemana.toISOString()

  // Métricas da semana via função SQL
  const { data: metrics } = await (supabase as any)
    .rpc('get_dashboard_metrics', { p_usuario_id: null })

  // Leads criados na semana
  const { count: leadsCriados } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', ini)
    .lte('created_at', fim)

  // Reuniões realizadas na semana
  const { count: reunioesRealizadas } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'realizada')
    .gte('data_hora', ini)
    .lte('data_hora', fim)

  // Contratos assinados na semana
  const { count: contratosAssinados } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'assinado')
    .gte('assinado_em', ini)
    .lte('assinado_em', fim)

  // Cobranças recebidas na semana e valor total
  const { data: cobrancasRecebidas } = await supabase
    .from('charges')
    .select('valor')
    .eq('status', 'pago')
    .gte('pago_em', ini)
    .lte('pago_em', fim)

  const receitaSemana = ((cobrancasRecebidas ?? []) as any[]).reduce((sum: number, c: any) => sum + (c.valor ?? 0), 0)

  // Leads por etapa (funil atual)
  const { data: funil } = await (supabase as any)
    .rpc('get_funnel_counts', { p_usuario_id: null })

  // Tarefas concluídas na semana
  const { count: tarefasConcluidas } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'concluida')
    .gte('concluida_em', ini)
    .lte('concluida_em', fim)

  // Top 5 responsáveis por leads fechados (contrato assinado)
  const { data: topComerciais } = await supabase
    .from('leads')
    .select('responsavel_comercial_id')
    .eq('etapa_comercial', 'pagamento_confirmado')
    .gte('updated_at', ini)
    .lte('updated_at', fim)
    .not('responsavel_comercial_id', 'is', null)
    .limit(100)

  // Agrupar por responsável
  const contagemComerciais: Record<string, { nome: string; total: number }> = {}
  ;(topComerciais ?? []).forEach((l: any) => {
    const id   = l.responsavel_comercial_id!
    const nome = l.responsavel_comercial?.full_name ?? 'Desconhecido'
    if (!contagemComerciais[id]) contagemComerciais[id] = { nome, total: 0 }
    contagemComerciais[id]!.total++
  })

  const rankingComercial = Object.values(contagemComerciais)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return NextResponse.json({
    periodo: {
      inicio: inicioSemana.toLocaleDateString('pt-BR'),
      fim:    fimSemana.toLocaleDateString('pt-BR'),
    },
    metricas: {
      leads_criados:        leadsCriados        ?? 0,
      reunioes_realizadas:  reunioesRealizadas  ?? 0,
      contratos_assinados:  contratosAssinados  ?? 0,
      tarefas_concluidas:   tarefasConcluidas   ?? 0,
      receita_semana:       receitaSemana,
    },
    funil:               funil          ?? [],
    estado_atual:        metrics        ?? {},
    ranking_comercial:   rankingComercial,
    gerado_em:           agora.toISOString(),
  })
}
