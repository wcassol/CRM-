import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { UuidSchema } from '@/lib/validators/shared.schema'

export const notificationsRouter = createTRPCRouter({

  // Notificações não lidas do usuário logado
  unread: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('notifications')
        .select('*')
        .eq('usuario_id', ctx.session!.userId)
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return { notifications: (data ?? []) as any[], total: data?.length ?? 0 }
    }),

  // Marcar como lida
  markRead: protectedProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('notifications')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', input)
        .eq('usuario_id', ctx.session!.userId)
      return { success: true }
    }),

  // Marcar todas como lidas
  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.supabase
        .from('notifications')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('usuario_id', ctx.session!.userId)
        .eq('lida', false)
      return { success: true }
    }),
})
