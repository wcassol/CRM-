import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { ProposalCreateSchema, ProposalUpdateSchema } from '@/lib/validators/proposal.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'

export const proposalsRouter = createTRPCRouter({

  byLead: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('proposals')
        .select('*')
        .eq('lead_id', input)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),

  create: protectedProcedure
    .input(ProposalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('proposals')
        .insert({ ...input, criado_por: ctx.session!.userId })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  send: protectedProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('proposals')
        .update({ status: 'enviada', enviada_em: new Date().toISOString() })
        .eq('id', input)
        .select('lead_id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Avança etapa do lead — RN-09: solicita data de follow-up
      if (data?.lead_id) {
        await ctx.supabase
          .from('leads')
          .update({ etapa_comercial: 'proposta_enviada' })
          .eq('id', data.lead_id)
          .eq('etapa_comercial', 'reuniao_realizada')
      }

      return { success: true }
    }),

  update: protectedProcedure
    .input(ProposalUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updates: Record<string, unknown> = { ...data }

      if (data.status === 'aceita' || data.status === 'recusada') {
        updates.respondida_em = new Date().toISOString()
      }

      const { data: updated, error } = await ctx.supabase
        .from('proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return updated
    }),
})
