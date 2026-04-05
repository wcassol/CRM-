'use client'

import { trpc } from '@/lib/trpc/client'

export function useCurrentUser() {
  const { data, isLoading } = trpc.users.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,  // 5 min — perfil muda raramente
  })
  return { user: data, isLoading }
}
