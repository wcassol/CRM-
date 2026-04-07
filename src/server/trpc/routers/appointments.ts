import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  AppointmentCreateSchema, AppointmentUpdateSchema, AppointmentResultSchema,
} from '@/lib/validators/appointment.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'

export const appointmentsRouter = createTRPCRouter({

  byLead: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('appointments')
        .select('*')
        .eq('lead_id', input)
        .is('deleted_at', null)
        .order('data_hora', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),

  create: protectedProcedure
    .input(AppointmentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('appointments')
        .insert({ ...input, criado_por: ctx.session!.userId })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Atualiza etapa do lead para reuniao_agendada
      await ctx.supabase
        .from('leads')
        .update({ etapa_comercial: 'reuniao_agendada' })
        .eq('id', input.lead_id)
        .in('etapa_comercial', ['triagem_concluida', 'aguardando_documentos', 'em_analise_viabilidade'])

      return data
    }),

  update: protectedProcedure
    .input(AppointmentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const { data: updated, error } = await ctx.supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return updated
    }),

  // Registra resultado após a reunião (realizada, faltou, cancelada)
  registerResult: protectedProcedure
    .input(AppointmentResultSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('appointments')
        .update({
          status:    input.status,
          resultado: input.resultado,
        })
        .eq('id', input.id)
        .select('lead_id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Se realizada, avança etapa do lead
      if (input.status === 'realizada' && data?.lead_id) {
        await ctx.supabase
          .from('leads')
          .update({ etapa_comercial: 'reuniao_realizada' })
          .eq('id', data.lead_id)
          .eq('etapa_comercial', 'reuniao_agendada')
      }

      return { success: true }
    }),

  delete: protectedProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('appointments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input)
      return { success: true }
    }),
})
