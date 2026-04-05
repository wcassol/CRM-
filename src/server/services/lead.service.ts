// =============================================================================
// CRM JURÍDICO — LEAD SERVICE
// =============================================================================

import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DbLeadInsert, DbLeadUpdate } from '@/types/database.types'
import type { AuthSession, PaginatedResult } from '@/types/domain.types'
import type { LeadListInput } from '@/lib/validators/lead.schema'

export class LeadService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async list(input: LeadListInput & { responsavel_id?: string }): Promise<PaginatedResult<any>> {
    let query = this.supabase
      .from('v_leads_resumo')
      .select('*', { count: 'exact' })

    if (input.pipeline)         query = query.eq('pipeline_atual', input.pipeline)
    if (input.etapa)            query = query.eq('etapa_comercial', input.etapa)
    if (input.area_juridica)    query = query.eq('area_juridica', input.area_juridica)
    if (input.temperatura)      query = query.eq('temperatura', input.temperatura)
    if (input.viabilidade)      query = query.eq('viabilidade_preliminar', input.viabilidade)
    if (input.responsavel_id)   query = query.eq('responsavel_comercial_id' as any, input.responsavel_id)
    if (input.com_tarefa_vencida) query = query.gt('tarefas_vencidas', 0)

    if (input.data_inicio) query = query.gte('created_at', input.data_inicio)
    if (input.data_fim)    query = query.lte('created_at', input.data_fim + 'T23:59:59')

    if (input.search) {
      // Busca por telefone, email, ou full-text
      query = query.or(
        `telefone.ilike.%${input.search}%,email.ilike.%${input.search}%`
      )
    }

    const sortField = input.sort_field ?? 'updated_at'
    query = query.order(sortField, { ascending: input.sort_direction === 'asc' })

    const { page, per_page } = input
    query = query.range((page - 1) * per_page, page * per_page - 1)

    const { data, count, error } = await query
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    return {
      data:        data ?? [],
      total:       count ?? 0,
      page,
      per_page,
      total_pages: Math.ceil((count ?? 0) / per_page),
    }
  }

  async kanban(input: { pipeline: string; usuario_id?: string; area_juridica?: string }) {
    let query = this.supabase
      .from('v_leads_resumo')
      .select('id, nome, telefone, area_juridica, etapa_comercial, temperatura, chance_fechamento_pct, valor_proposto, data_proxima_acao, responsavel_comercial_nome, responsavel_comercial_avatar, tarefas_vencidas, documentos_pendentes, urgencia, prazo_sensivel, updated_at')
      .eq('pipeline_atual', input.pipeline)

    if (input.usuario_id)   query = query.eq('responsavel_comercial_id' as any, input.usuario_id)
    if (input.area_juridica) query = query.eq('area_juridica', input.area_juridica)

    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    return data ?? []
  }

  async findById(id: string, session: AuthSession) {
    const { data, error } = await this.supabase
      .from('leads')
      .select(`
        *,
        responsavel_comercial:users!leads_responsavel_comercial_id_fkey(id, full_name, avatar_url),
        responsavel_juridico:users!leads_responsavel_juridico_id_fkey(id, full_name, avatar_url),
        source:lead_sources(id, nome, canal),
        loss_reason:loss_reasons(id, descricao),
        tags:lead_tags(tag)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    return data
  }

  async create(input: DbLeadInsert) {
    const { data, error } = await this.supabase
      .from('leads')
      .insert(input)
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
    return data
  }

  async update(id: string, input: DbLeadUpdate) {
    const { data, error } = await this.supabase
      .from('leads')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data
  }
}
