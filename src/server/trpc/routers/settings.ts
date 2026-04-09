import { z } from 'zod'
import { createTRPCRouter, adminProcedure, protectedProcedure } from '../trpc'

export const settingsRouter = createTRPCRouter({

  // ── Loss Reasons ────────────────────────────────────────────────────────────
  listLossReasons: protectedProcedure
    .input(z.object({ pipeline: z.enum(['comercial', 'perdas']).optional() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      let q = db.from('loss_reasons').select('*').eq('ativo', true).order('descricao')
      if (input.pipeline) q = q.eq('pipeline', input.pipeline)
      const { data } = await q
      return (data ?? []) as any[]
    }),

  createLossReason: adminProcedure
    .input(z.object({ descricao: z.string().min(3), pipeline: z.enum(['comercial', 'perdas']).default('comercial') }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { data } = await db.from('loss_reasons').insert(input).select().single()
      return data as any
    }),

  updateLossReason: adminProcedure
    .input(z.object({ id: z.string().uuid(), descricao: z.string().min(3).optional(), ativo: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const db = ctx.supabase as any
      await db.from('loss_reasons').update(rest).eq('id', id)
      return { success: true }
    }),

  deleteLossReason: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      await db.from('loss_reasons').update({ ativo: false }).eq('id', input.id)
      return { success: true }
    }),

  // ── Document Requirements ───────────────────────────────────────────────────
  listDocumentTypes: protectedProcedure
    .input(z.object({ area_juridica: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      let q = db.from('document_requirements').select('*').eq('ativo', true).order('area_juridica').order('nome')
      if (input.area_juridica) q = q.eq('area_juridica', input.area_juridica)
      const { data } = await q
      return (data ?? []) as any[]
    }),

  createDocumentType: adminProcedure
    .input(z.object({
      nome: z.string().min(2),
      area_juridica: z.string().min(2),
      obrigatorio: z.boolean().default(true),
      instrucoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { data } = await db.from('document_requirements').insert(input).select().single()
      return data as any
    }),

  updateDocumentType: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).optional(),
      obrigatorio: z.boolean().optional(),
      instrucoes: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const db = ctx.supabase as any
      await db.from('document_requirements').update(rest).eq('id', id)
      return { success: true }
    }),

  deleteDocumentType: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      await db.from('document_requirements').update({ ativo: false }).eq('id', input.id)
      return { success: true }
    }),

  // ── Custom Fields ────────────────────────────────────────────────────────────
  listCustomFields: protectedProcedure
    .query(async ({ ctx }) => {
      const db = ctx.supabase as any
      const { data } = await db.from('custom_field_definitions').select('*').eq('ativo', true).order('ordem').order('label')
      return (data ?? []) as any[]
    }),

  createCustomField: adminProcedure
    .input(z.object({
      entidade:      z.string().default('lead'),
      nome:          z.string().min(2).regex(/^[a-z_]+$/, 'Use apenas letras minúsculas e _'),
      label:         z.string().min(2),
      tipo:          z.enum(['text', 'number', 'date', 'boolean', 'select']),
      opcoes:        z.array(z.string()).optional(),
      obrigatorio:   z.boolean().default(false),
      area_juridica: z.string().optional(),
      ordem:         z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const payload = { ...input, opcoes: input.opcoes ? JSON.stringify(input.opcoes) : null }
      const { data } = await db.from('custom_field_definitions').insert(payload).select().single()
      return data as any
    }),

  deleteCustomField: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      await db.from('custom_field_definitions').update({ ativo: false }).eq('id', input.id)
      return { success: true }
    }),
})
