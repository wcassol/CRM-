'use client'

import { useCurrentUser } from './useCurrentUser'
import { checkPermission } from '@/lib/auth/permissions'
import type { Modulo, Acao } from '@/types/permissions.types'
import type { UserRole } from '@/types/database.types'

export function usePermission(modulo: Modulo, acao: Acao): boolean {
  const { user } = useCurrentUser()
  if (!user) return false
  const role = (user.roles as any)?.name as UserRole
  return checkPermission(role, modulo, acao)
}

export function useRole(): UserRole | null {
  const { user } = useCurrentUser()
  if (!user) return null
  return (user.roles as any)?.name as UserRole
}
