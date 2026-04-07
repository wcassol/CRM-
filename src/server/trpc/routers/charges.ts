import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { ChargeCreateSchema, ChargeUpdateSchema } from '@/lib/validators/charge.schema'
import { UuidSchema } from '@/lib/validators/shared.schema'
import { AsaasClient } from '@/server/integrations/asaas.client'

export const chargesRouter = createTRPCRouter({

  byLead: protectedProcedure
    .input(UuidSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('v_cobracas_dashboard')
        .select('*')
        .eq('lead_id', input)
        .order('vencimento', { ascending: true })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  // Visão financeira global
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('v_cobracas_dashboard')
        .select('*')
        .order('vencimento', { ascending: true })
        .limit(100)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return (data ?? []) as any[]
    }),

  create: protectedProcedure
    .input(ChargeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      let asaasId: string | null = null
      let linkPagamento: string | null = null

      // Criar cobrança no Asaas se solicitado
      if (input.enviar_asaas) {
        const asaas = new AsaasClient()

        // Buscar dados do lead para criar cliente no Asaas
        const { data: lead } = await ctx.supabase
          .from('leads')
          .select('nome, cpf, email, telefone')
          .eq('id', input.lead_id)
          .single()

        if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead não encontrado.' })

        const asaasResult = await asaas.createCharge({
          nome:      lead.nome,
          cpfCnpj:   lead.cpf ?? '',
          email:     lead.email ?? undefined,
          valor:     input.valor,
          vencimento: input.vencimento,
          descricao:  input.descricao,
        })

        asaasId        = asaasResult.id
        linkPagamento  = asaasResult.invoiceUrl ?? null
      }

      const { data, error } = await ctx.supabase
        .from('charges')
        .insert({
          lead_id:       input.lead_id,
          contract_id:   input.contract_id,
          valor:         input.valor,
          vencimento:    input.vencimento,
          descricao:     input.descricao,
          asaas_id:      asaasId,
          link_pagamento: linkPagamento,
          criado_por:    ctx.session!.userId,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: protectedProcedure
    .input(ChargeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const { data: updated, error } = await ctx.supabase
        .from('charges')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return updated
    }),
})
