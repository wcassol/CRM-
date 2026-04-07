// =============================================================================
// CRM JURÍDICO — tRPC ROUTER: Dashboard
// =============================================================================

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const dashboardRouter = createTRPCRouter({

  /**
   * Métricas gerais (cards do topo)
   */
  metrics: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session!.role !== 'admin'
        ? ctx.session!.userId
        : undefined

      const db = ctx.supabase as any
      const { data, error } = await db
        .rpc('get_dashboard_metrics', { p_usuario_id: userId ?? null })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data as {
        leads_hoje:          number
        reunioes_hoje:       number
        propostas_abertas:   number
        contratos_pendentes: number
        cobracas_pendentes:  number
        tarefas_vencidas:    number
        onboardings_ativos:  number
      }
    }),

  /**
   * Contagem por etapa para o gráfico de funil
   */
  funnel: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session!.role !== 'admin'
        ? ctx.session!.userId
        : undefined

      const db = ctx.supabase as any
      const { data, error } = await db
        .rpc('get_funnel_counts', { p_usuario_id: userId ?? null })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as Array<{ etapa: string; total: number; valor_total: number }>
    }),

  /**
   * Próximas reuniões (hoje + próximos 7 dias)
   */
  proximasReunioes: protectedProcedure
    .query(async ({ ctx }) => {
      const db = ctx.supabase as any
      const { data, error } = await db
        .from('v_proximas_reunioes')
        .select('*')
        .limit(10)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  /**
   * Tarefas vencidas do usuário
   */
  tarefasVencidas: protectedProcedure
    .query(async ({ ctx }) => {
      const db = ctx.supabase as any
      const query = db
        .from('v_tasks_enriquecidas')
        .select('*')
        .eq('esta_vencida', true)
        .in('status', ['aberta', 'em_andamento'])
        .order('vencimento', { ascending: true })
        .limit(10)

      if (ctx.session!.role !== 'admin') {
        query.eq('responsavel_id', ctx.session!.userId)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  /**
   * Leads recentes (últimas 24h)
   */
  leadsRecentes: protectedProcedure
    .query(async ({ ctx }) => {
      const db = ctx.supabase as any
      const query = db
        .from('v_leads_resumo')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (ctx.session!.role !== 'admin') {
        query.eq('responsavel_comercial_id', ctx.session!.userId)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  /**
   * Taxa de conversão por período (para gráfico de linhas)
   */
  conversao: protectedProcedure
    .input(z.object({
      data_inicio: z.string().date().optional(),
      data_fim:    z.string().date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { data, error } = await db
        .rpc('get_conversion_rate', {
          p_data_inicio: input.data_inicio ?? undefined,
          p_data_fim:    input.data_fim ?? undefined,
        })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),
})
