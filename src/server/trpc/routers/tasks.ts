import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
  TaskCreateSchema, TaskUpdateSchema, TaskCompleteSchema, TaskListSchema,
} from '@/lib/validators/task.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'

export const tasksRouter = createTRPCRouter({

  list: protectedProcedure
    .input(TaskListSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('v_tasks_enriquecidas')
        .select('*')

      if (input.lead_id)        query = query.eq('lead_id', input.lead_id)
      if (input.responsavel_id) query = query.eq('responsavel_id', input.responsavel_id)
      if (input.status)         query = query.eq('status', input.status)
      if (input.prioridade)     query = query.eq('prioridade', input.prioridade)
      if (input.apenas_vencidas) query = query.eq('esta_vencida', true)

      // Não-admin vê apenas as próprias tarefas e as dos seus leads
      if (ctx.session!.role !== 'admin' && !input.responsavel_id) {
        query = query.eq('responsavel_id', ctx.session!.userId)
      }

      const { data, error } = await query
        .order('esta_vencida', { ascending: false })
        .order('prioridade', { ascending: false })
        .order('vencimento', { ascending: true, nullsFirst: false })
        .range(
          (input.page - 1) * input.per_page,
          input.page * input.per_page - 1
        )

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  create: protectedProcedure
    .input(TaskCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .insert({
          ...input,
          created_by: ctx.session!.userId,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: protectedProcedure
    .input(TaskUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verificar se o usuário pode editar a tarefa
      const { data: existing } = await ctx.supabase
        .from('tasks')
        .select('responsavel_id, created_by')
        .eq('id', id)
        .single()

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

      const podeEditar =
        ctx.session!.role === 'admin' ||
        existing.responsavel_id === ctx.session!.userId ||
        existing.created_by === ctx.session!.userId

      if (!podeEditar) throw new TRPCError({ code: 'FORBIDDEN' })

      const { data: updated, error } = await ctx.supabase
        .from('tasks')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return updated
    }),

  complete: protectedProcedure
    .input(TaskCompleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .update({
          status:       'concluida',
          concluida_em: new Date().toISOString(),
          concluida_por: ctx.session!.userId,
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return data
    }),

  delete: protectedProcedure
    .input(UuidSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from('tasks')
        .select('created_by')
        .eq('id', input)
        .single()

      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

      if (existing.created_by !== ctx.session!.userId && ctx.session!.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      await ctx.supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input)

      return { success: true }
    }),
})
