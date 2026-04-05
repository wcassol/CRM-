// =============================================================================
// CRM JURÍDICO — tRPC CONTEXT
// Contexto injetado em cada request: sessão + cliente Supabase
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'
import type { AuthSession } from '@/types/domain.types'

export interface TRPCContext {
  session:  AuthSession | null
  supabase: ReturnType<typeof createServerClient<Database>>
  headers:  Headers
}

export async function createTRPCContext(opts: { headers: Headers }): Promise<TRPCContext> {
  const cookieStore = cookies()

  // Cliente Supabase com service_role — bypass RLS para lógica de negócio
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // NUNCA expor no cliente
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Extrair sessão do JWT no cookie
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { session: null, supabase, headers: opts.headers }
  }

  // Buscar dados de perfil (role, nome, avatar)
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role_id, avatar_url, roles(name)')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (!profile) {
    return { session: null, supabase, headers: opts.headers }
  }

  const session: AuthSession = {
    userId:    user.id,
    email:     user.email!,
    role:      (profile.roles as any)?.name ?? 'comercial',
    fullName:  profile.full_name,
    avatarUrl: profile.avatar_url,
  }

  return { session, supabase, headers: opts.headers }
}
