import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc'
import { UuidSchema } from '@/lib/validators/shared.schema'

const InteractionTipoZ = z.enum(['nota', 'email', 'whatsapp', 'ligacao', 'sistema', 'reuniao', 'tarefa'])

export const interactionsRouter = createTRPCRouter({

  list: protectedProcedure
    .input(z.object({
      lead_id: UuidSchema,
      tipo:    InteractionTipoZ.optional(),
      limit:   z.number().int().min(1).max(200).default(50),
      offset:  z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('lead_interactions')
        .select('*, usuario:users(id, full_name, avatar_url)')
        .eq('lead_id', input.lead_id)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.tipo) query = query.eq('tipo', input.tipo)

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),

  create: protectedProcedure
    .input(z.object({
      lead_id:  UuidSchema,
      tipo:     InteractionTipoZ.default('nota'),
      conteudo: z.string().min(1, 'Conteúdo obrigatório').max(5000),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('lead_interactions')
        .insert({
          ...input,
          usuario_id: ctx.session!.userId,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Editar apenas a própria nota; admin pode editar qualquer uma
  update: protectedProcedure
    .input(z.object({
      id:       UuidSchema,
      conteudo: z.string().min(1).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar autoria
      const { data: existing } = await ctx.supabase
        .from('lead_interactions')
        .select('usuario_id, tipo')
        .eq('id', input.id)
        .single()

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

      if (existing.tipo !== 'nota') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas notas podem ser editadas.' })
      }

      if (existing.usuario_id !== ctx.session!.userId && ctx.session!.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você só pode editar as suas próprias notas.' })
      }

      const { data, error } = await ctx.supabase
        .from('lead_interactions')
        .update({ conteudo: input.conteudo })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  delete: adminProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from('lead_interactions').delete().eq('id', input)
      return { success: true }
    }),
})
