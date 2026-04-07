// =============================================================================
// CRM JURÍDICO — tRPC HTTP handler (Next.js App Router)
// Expõe todos os 12 routers em /api/trpc/*
// =============================================================================

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest }     from 'next/server'
import { appRouter }            from '@/server/trpc/root'
import { createTRPCContext }    from '@/server/trpc/context'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:      '/api/trpc',
    req,
    router:        appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC error on /${path ?? 'unknown'}:`, error)
          }
        : undefined,
  })

export { handler as GET, handler as POST }
