import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { ContractSendSchema, ContractUpdateSchema } from '@/lib/validators/contract.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'
import { ZapSignClient } from '@/server/integrations/zapsign.client'

export const contractsRouter = createTRPCRouter({

  byLead: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contracts')
        .select('*')
        .eq('lead_id', input)
        .order('created_at', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  // Envia contrato via ZapSign
  send: protectedProcedure
    .input(ContractSendSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar se não há contrato ativo
      const { data: existing } = await ctx.supabase
        .from('contracts')
        .select('id, status')
        .eq('lead_id', input.lead_id)
        .in('status', ['enviado', 'assinado'])
        .maybeSingle()

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Já existe um contrato enviado ou assinado para este lead.',
        })
      }

      // Criar contrato no ZapSign
      const zapSign = new ZapSignClient()
      const { token, doc_url } = await zapSign.createDocument({
        lead_id:     input.lead_id,
        template_id: input.template_id,
      })

      // Salvar no banco
      const { data, error } = await ctx.supabase
        .from('contracts')
        .insert({
          lead_id:        input.lead_id,
          proposal_id:    input.proposal_id,
          zapsign_token:  token,
          zapsign_doc_url: doc_url,
          status:         'enviado',
          enviado_em:     new Date().toISOString(),
          enviado_por:    ctx.session!.userId,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Avança etapa
      await ctx.supabase
        .from('leads')
        .update({ etapa_comercial: 'contrato_enviado' })
        .eq('id', input.lead_id)

      return data
    }),

  update: protectedProcedure
    .input(ContractUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const { data: updated, error } = await ctx.supabase
        .from('contracts')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return updated
    }),
})
