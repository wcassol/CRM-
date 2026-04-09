import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, adminProcedure } from '../trpc'

const ChaveSchema = z.enum(['zapsign', 'asaas', 'calcom', 'n8n', 'astrea', 'zapconnecta'])

export const integracoesRouter = createTRPCRouter({

  // Buscar configuração de uma integração
  get: adminProcedure
    .input(z.object({ chave: ChaveSchema }))
    .query(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { data } = await db
        .from('integrations')
        .select('nome, ativo, config')
        .eq('nome', input.chave)
        .single()

      if (!data) return null
      return { chave: data.nome, ativo: data.ativo, config: data.config ?? {} } as {
        chave: string; ativo: boolean; config: Record<string, string>
      }
    }),

  // Salvar/atualizar configuração
  save: adminProcedure
    .input(z.object({
      chave:  ChaveSchema,
      config: z.record(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { error } = await db
        .from('integrations')
        .upsert(
          { nome: input.chave, config: input.config, ativo: true },
          { onConflict: 'nome' }
        )

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // Testar conectividade da integração
  test: adminProcedure
    .input(z.object({ chave: ChaveSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.supabase as any
      const { data } = await db
        .from('integrations')
        .select('config, ativo')
        .eq('nome', input.chave)
        .single()

      const config = data as { config: Record<string, string>; ativo: boolean } | null

      if (!config?.config || !config.ativo) {
        return { ok: false, message: 'Integração não configurada' }
      }

      try {
        switch (input.chave) {
          case 'n8n': {
            const cfg = config.config as { base_url?: string; api_key?: string }
            if (!cfg.base_url) return { ok: false, message: 'URL base não configurada' }
            const res = await fetch(`${cfg.base_url}/healthz`, {
              headers: cfg.api_key ? { 'X-N8N-API-KEY': cfg.api_key } : {},
              signal: AbortSignal.timeout(5000),
            })
            return { ok: res.ok, message: res.ok ? 'Conexão OK' : `HTTP ${res.status}` }
          }
          case 'asaas': {
            const cfg = config.config as { api_key?: string }
            if (!cfg.api_key) return { ok: false, message: 'API Key não configurada' }
            const res = await fetch('https://www.asaas.com/api/v3/myAccount', {
              headers: { access_token: cfg.api_key },
              signal: AbortSignal.timeout(5000),
            })
            return { ok: res.ok, message: res.ok ? 'Conexão OK' : `HTTP ${res.status}` }
          }
          default:
            return { ok: true, message: 'Verificação não disponível para esta integração' }
        }
      } catch {
        return { ok: false, message: 'Timeout ou erro de rede' }
      }
    }),
})
