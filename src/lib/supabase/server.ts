// =============================================================================
// CRM JURÍDICO — Supabase server-side admin client
// Usado exclusivamente em server-side code (API routes, webhooks, server actions)
// NUNCA importar em componentes 'use client'
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Cria um cliente Supabase com service_role key.
 * Bypassa RLS — usar apenas em código server-side confiável.
 */
export function createAdminSupabase() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !roleKey) {
    throw new Error(
      'Supabase env vars ausentes: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.'
    )
  }

  return createClient<Database>(url, roleKey, {
    auth: {
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false,
    },
  })
}
