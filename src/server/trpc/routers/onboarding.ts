import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  OnboardingItemUpdateSchema, OnboardingAssignSchema, SendToAstreaSchema,
} from '@/lib/validators/onboarding.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'
import { AuditService } from '@/server/services/audit.service'

export const onboardingRouter = createTRPCRouter({

  // Visão geral de todos os onboardings ativos (jurídico)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const query = ctx.supabase
        .from('v_onboardings_ativos')
        .select('*')
        .order('created_at', { ascending: true })

      if (ctx.session!.role === 'juridico') {
        query.eq('responsavel_juridico_id' as any, ctx.session!.userId)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  // Checklist completo de um lead
  byLead: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('onboarding_checklists')
        .select(`
          *,
          responsavel_juridico:users(id, full_name, avatar_url),
          items:onboarding_items(*, concluido_por_user:users(id, full_name))
        `)
        .eq('lead_id', input)
        .single()

      if (error && error.code === 'PGRST116') return null  // não encontrado
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  // Atribuir responsável jurídico
  assign: protectedProcedure
    .input(OnboardingAssignSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('onboarding_checklists')
        .update({ responsavel_juridico_id: input.responsavel_juridico_id })
        .eq('id', input.checklist_id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  // Atualizar item do checklist
  updateItem: protectedProcedure
    .input(OnboardingItemUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        status:    input.status,
        observacao: input.observacao,
      }

      if (input.status === 'concluido') {
        updateData.concluido_por = ctx.session!.userId
        updateData.concluido_em  = new Date().toISOString()
      } else {
        updateData.concluido_por = null
        updateData.concluido_em  = null
      }

      const { data, error } = await ctx.supabase
        .from('onboarding_items')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  // Enviar ao Astrea (só liberado quando todos os itens obrigatórios estão concluídos)
  sendToAstrea: protectedProcedure
    .input(SendToAstreaSchema)
    .mutation(async ({ ctx, input }) => {
      const auditSvc = new AuditService(ctx.supabase)

      // Verificar se pode enviar
      const { data: checklist } = await ctx.supabase
        .from('v_onboardings_ativos')
        .select('pode_enviar_astrea, lead_id')
        .eq('checklist_id', input.checklist_id)
        .single()

      if (!checklist?.pode_enviar_astrea) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'RN-06: Todos os itens obrigatórios devem estar concluídos antes de enviar ao Astrea.',
        })
      }

      const now = new Date().toISOString()

      // Atualiza checklist
      await ctx.supabase
        .from('onboarding_checklists')
        .update({
          referencia_astrea: input.referencia_astrea,
          enviado_astrea_em: now,
          enviado_por:       ctx.session!.userId,
        })
        .eq('id', input.checklist_id)

      // Atualiza lead
      await ctx.supabase
        .from('leads')
        .update({
          referencia_astrea:  input.referencia_astrea,
          data_envio_astrea:  now,
          enviado_astrea_por: ctx.session!.userId,
          etapa_onboarding:   'cliente_ativo',
        })
        .eq('id', checklist.lead_id)

      await auditSvc.log({
        entity_type: 'lead',
        entity_id:   checklist.lead_id,
        action:      'update',
        usuario_id:  ctx.session!.userId,
        dados_novos: { referencia_astrea: input.referencia_astrea, enviado_astrea_em: now },
      })

      return { success: true }
    }),
})
