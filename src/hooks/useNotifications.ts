'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

export function useNotifications() {
  const utils = trpc.useUtils()
  const { user } = useCurrentUser()
  const { data, isLoading } = trpc.notifications.unread.useQuery(undefined, {
    refetchInterval: 60_000,  // fallback polling: 1 min
  })

  const markRead    = trpc.notifications.markRead.useMutation()
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.unread.invalidate(),
  })

  // Realtime via Supabase — notificação em tempo real sem polling
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => utils.notifications.unread.invalidate()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, utils])

  return {
    notifications: data?.notifications ?? [],
    total:         data?.total ?? 0,
    isLoading,
    markRead:      (id: string) => markRead.mutate(id),
    markAllRead:   () => markAllRead.mutate(),
  }
}
