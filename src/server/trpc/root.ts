// =============================================================================
// CRM JURÍDICO — tRPC ROOT ROUTER
// Agrega todos os routers do sistema
// =============================================================================

import { createTRPCRouter } from './trpc'
import { leadsRouter }        from './routers/leads'
import { dashboardRouter }    from './routers/dashboard'
import { interactionsRouter } from './routers/interactions'
import { appointmentsRouter } from './routers/appointments'
import { proposalsRouter }    from './routers/proposals'
import { contractsRouter }    from './routers/contracts'
import { chargesRouter }      from './routers/charges'
import { tasksRouter }        from './routers/tasks'
import { onboardingRouter }   from './routers/onboarding'
import { notificationsRouter }from './routers/notifications'
import { usersRouter }        from './routers/users'
import { integracoesRouter }  from './routers/integracoes'

export const appRouter = createTRPCRouter({
  dashboard:     dashboardRouter,
  leads:         leadsRouter,
  interactions:  interactionsRouter,
  appointments:  appointmentsRouter,
  proposals:     proposalsRouter,
  contracts:     contractsRouter,
  charges:       chargesRouter,
  tasks:         tasksRouter,
  onboarding:    onboardingRouter,
  notifications: notificationsRouter,
  users:         usersRouter,
  integracoes:   integracoesRouter,
})

// Tipo exportado para uso no cliente (type-safe end-to-end)
export type AppRouter = typeof appRouter
