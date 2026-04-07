// =============================================================================
// CRM JURÍDICO — tRPC ROUTER: Leads
// =============================================================================

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc'
import {
  LeadCreateSchema, LeadUpdateSchema, LeadListSchema,
  LeadTriagemSchema, LeadComercialSchema, LeadTagSchema, MoveStageSchema,
} from '@/lib/validators/lead.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'
import { LeadService } from '@/server/services/lead.service'
import { PipelineService } from '@/server/services/pipeline.service'
import { AuditService } from '@/server/services/audit.service'

export const leadsRouter = createTRPCRouter({

  // ──────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Listagem paginada com filtros — usado na tabela e kanban
   */
  list: protectedProcedure
    .input(LeadListSchema)
    .query(async ({ ctx, input }) => {
      const svc = new LeadService(ctx.supabase)
      return svc.list({
        ...input,
        // Se não for admin, filtrar por responsável
        responsavel_id: ctx.session!.role !== 'admin'
          ? (input.responsavel_id ?? ctx.session!.userId)
          : input.responsavel_id,
      })
    }),

  /**
   * Leads agrupados por etapa — para o kanban (retorna só campos do card)
   */
  kanban: protectedProcedure
    .input(z.object({
      pipeline:      z.enum(['comercial', 'onboarding', 'perdas']).default('comercial'),
      responsavel_id: UuidSchema.optional(),
      area_juridica:  z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const svc = new LeadService(ctx.supabase)
      return svc.kanban({
        ...input,
        usuario_id: ctx.session!.role !== 'admin'
          ? ctx.session!.userId
          : input.responsavel_id,
      })
    }),

  /**
   * Detalhe completo do lead com todos os relacionamentos
   */
  byId: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const svc = new LeadService(ctx.supabase)
      const lead = await svc.findById(input, ctx.session!)
      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead não encontrado.' })
      }
      return lead
    }),

  /**
   * Verifica duplicatas por telefone ou CPF antes de criar
   */
  checkDuplicate: protectedProcedure
    .input(z.object({
      telefone: z.string(),
      cpf:      z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .rpc('find_duplicate_leads', {
          p_telefone: input.telefone.replace(/\D/g, ''),
          p_cpf:      input.cpf?.replace(/\D/g, '') ?? null,
        })
      return { duplicates: data ?? [] }
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Criar lead manualmente
   */
  create: protectedProcedure
    .input(LeadCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const svc     = new LeadService(ctx.supabase)
      const auditSvc = new AuditService(ctx.supabase)

      const lead = await svc.create({
        ...input,
        created_by: ctx.session!.userId,
        responsavel_comercial_id: input.responsavel_comercial_id ?? ctx.session!.userId,
      })

      await auditSvc.log({
        entity_type: 'lead',
        entity_id:   lead.id,
        action:      'create',
        usuario_id:  ctx.session!.userId,
        dados_novos: lead,
      })

      return lead
    }),

  /**
   * Atualizar dados básicos do lead
   */
  update: protectedProcedure
    .input(LeadUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const svc      = new LeadService(ctx.supabase)
      const auditSvc = new AuditService(ctx.supabase)

      const { id, ...data } = input
      const anterior = await svc.findById(id, ctx.session!)

      if (!anterior) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const atualizado = await svc.update(id, data)

      await auditSvc.log({
        entity_type:      'lead',
        entity_id:        id,
        action:           'update',
        usuario_id:       ctx.session!.userId,
        dados_anteriores: anterior,
        dados_novos:      atualizado,
      })

      return atualizado
    }),

  /**
   * Salvar triagem e qualificação do lead
   */
  salvarTriagem: protectedProcedure
    .input(LeadTriagemSchema)
    .mutation(async ({ ctx, input }) => {
      const svc      = new LeadService(ctx.supabase)
      const pipeSvc  = new PipelineService(ctx.supabase)
      const auditSvc = new AuditService(ctx.supabase)

      const { id, ...data } = input

      await svc.update(id, {
        ...data,
        etapa_comercial: 'triagem_concluida',
      })

      // Se inviável, mover para pipeline de perdas
      if (data.viabilidade_preliminar === 'inviavel') {
        await pipeSvc.moveStage({
          lead_id:        id,
          pipeline:       'perdas',
          etapa_nova:     'sem_viabilidade',
          usuario_id:     ctx.session!.userId,
          loss_reason_id: data.loss_reason_id,
          motivo:         data.motivo_perda_obs,
        })
      }

      await auditSvc.log({
        entity_type: 'lead',
        entity_id:   id,
        action:      'update',
        usuario_id:  ctx.session!.userId,
        dados_novos: { triagem: data },
      })

      return { success: true }
    }),

  /**
   * Mover lead para outra etapa do pipeline (drag-and-drop ou ação manual)
   */
  moveStage: protectedProcedure
    .input(MoveStageSchema)
    .mutation(async ({ ctx, input }) => {
      const pipeSvc = new PipelineService(ctx.supabase)
      return pipeSvc.moveStage({
        ...input,
        usuario_id: ctx.session!.userId,
      })
    }),

  /**
   * Atualizar dados comerciais (valor, objeção, chance de fechamento)
   */
  updateComercial: protectedProcedure
    .input(LeadComercialSchema)
    .mutation(async ({ ctx, input }) => {
      const svc = new LeadService(ctx.supabase)
      const { id, ...data } = input
      return svc.update(id, data)
    }),

  /**
   * Adicionar tag ao lead
   */
  addTag: protectedProcedure
    .input(LeadTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('lead_tags')
        .insert({ ...input, created_by: ctx.session!.userId })
      if (error?.code === '23505') return { success: true }  // já existe
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  /**
   * Remover tag do lead
   */
  removeTag: protectedProcedure
    .input(z.object({ lead_id: UuidSchema, tag: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', input.lead_id)
        .eq('tag', input.tag)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return { success: true }
    }),

  /**
   * Soft delete — apenas admin
   */
  delete: adminProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      const auditSvc = new AuditService(ctx.supabase)

      await ctx.supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input)

      await auditSvc.log({
        entity_type: 'lead',
        entity_id:   input,
        action:      'delete',
        usuario_id:  ctx.session!.userId,
      })

      return { success: true }
    }),

  /**
   * Histórico de pipeline do lead
   */
  pipelineHistory: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pipeline_history')
        .select('*, usuario:users(id, full_name, avatar_url)')
        .eq('lead_id', input)
        .order('created_at', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),
})
