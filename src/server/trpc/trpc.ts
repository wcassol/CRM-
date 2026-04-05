// =============================================================================
// CRM JURÍDICO — tRPC INIT
// Inicialização, middlewares e procedure builders
// =============================================================================

import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { TRPCContext } from './context'
import { can, type Modulo, type Acao } from '@/types/permissions.types'

// ─── Instância tRPC ───────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    }
  },
})

// ─── Router e Middleware builders ─────────────────────────────────────────────

export const createTRPCRouter  = t.router
export const createCallerFactory = t.createCallerFactory

// ─── Middlewares ──────────────────────────────────────────────────────────────

// Garante que o usuário está autenticado
const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão expirada. Faça login novamente.' })
  }
  return next({ ctx: { ...ctx, session: ctx.session } })
})

// Garante que o usuário é admin
const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (ctx.session.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem executar esta ação.' })
  }
  return next({ ctx: { ...ctx, session: ctx.session } })
})

// Factory: verifica permissão específica de módulo + ação
const enforcePermission = (modulo: Modulo, acao: Acao) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    if (!can(ctx.session.role, modulo, acao)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Você não tem permissão para executar esta ação (${modulo}:${acao}).`,
      })
    }
    return next({ ctx: { ...ctx, session: ctx.session } })
  })

// Log de execução (desenvolvimento)
const logger = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const ms = Date.now() - start
  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} — ${ms}ms ${result.ok ? '✓' : '✗'}`)
  }
  return result
})

// ─── Procedure Builders exportados ───────────────────────────────────────────

// Procedure pública (apenas para health check / webhooks internos)
export const publicProcedure = t.procedure.use(logger)

// Procedure autenticada (base para todos os módulos)
export const protectedProcedure = t.procedure.use(logger).use(enforceAuthenticated)

// Procedure apenas para admin
export const adminProcedure = t.procedure.use(logger).use(enforceAdmin)

// Factory: procedure com permissão específica
export const permissionProcedure = (modulo: Modulo, acao: Acao) =>
  t.procedure.use(logger).use(enforceAuthenticated).use(enforcePermission(modulo, acao))
