import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc'
import { UuidSchema } from '@/lib/validators/shared.schema'

export const usersRouter = createTRPCRouter({

  // Todos os usuários ativos (para selects de responsável)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .select('id, full_name, avatar_url, role_id, roles(name, display_name)')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),

  // Usuários por role (para select "jurídicos disponíveis")
  byRole: protectedProcedure
    .input(z.enum(['admin', 'comercial', 'pre_juridico', 'juridico', 'financeiro']))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .select('id, full_name, avatar_url, roles!inner(name)')
        .eq('is_active', true)
        .eq('roles.name', input)
        .order('full_name')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data ?? []
    }),

  // Perfil do usuário logado
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .select('*, roles(name, display_name, permissions)')
        .eq('id', ctx.session!.userId)
        .single()

      if (error) throw new TRPCError({ code: 'NOT_FOUND' })
      return data
    }),

  // Atualizar próprio perfil
  updateProfile: protectedProcedure
    .input(z.object({
      full_name:  z.string().min(2).max(200).optional(),
      phone:      z.string().optional().nullable(),
      avatar_url: z.string().url().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .update(input)
        .eq('id', ctx.session!.userId)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  // Convidar usuário (admin)
  invite: adminProcedure
    .input(z.object({
      email:    z.string().email(),
      full_name: z.string().min(2),
      role_id:  UuidSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Supabase Admin API — cria usuário e envia invite por email
      const { data, error } = await ctx.supabase.auth.admin.inviteUserByEmail(input.email, {
        data: { full_name: input.full_name, role_id: input.role_id },
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true, user_id: data.user.id }
    }),

  // Ativar/desativar usuário (admin)
  toggleActive: adminProcedure
    .input(z.object({ id: UuidSchema, is_active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session!.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não pode desativar sua própria conta.' })
      }

      await ctx.supabase
        .from('users')
        .update({ is_active: input.is_active })
        .eq('id', input.id)

      return { success: true }
    }),

  // Alterar role (admin)
  updateRole: adminProcedure
    .input(z.object({ id: UuidSchema, role_id: UuidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('users')
        .update({ role_id: input.role_id })
        .eq('id', input.id)
      return { success: true }
    }),
})
