'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { describeNotification, type AppNotification } from '@/lib/notifications'

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx
}

const SELECT_QUERY =
  '*, actor:profiles!notifications_actor_id_fkey(display_name, avatar_url)'

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  // Stable client instance across renders.
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // Initial fetch.
  useEffect(() => {
    let active = true
    supabase
      .from('notifications')
      .select(SELECT_QUERY)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return
        setNotifications((data as AppNotification[]) ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [supabase])

  // Realtime subscription for new notifications.
  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    const handleInsert = async (payload: { new: AppNotification }) => {
      const row = payload.new
      // The realtime payload doesn't include the joined actor profile.
      let actor: AppNotification['actor'] = null
      if (row.actor_id) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', row.actor_id)
          .single()
        actor = data
      }
      const enriched: AppNotification = { ...row, actor }
      setNotifications((prev) =>
        prev.some((n) => n.id === enriched.id) ? prev : [enriched, ...prev],
      )
      toast(describeNotification(enriched).title)
    }

    const subscribe = async () => {
      // Realtime checks the postgres_changes subscription against RLS, which
      // requires the user's JWT on the websocket. The session is hydrated from
      // cookies asynchronously, so set the token *before* subscribing — otherwise
      // Realtime connects as the anon role, RLS rejects it, and no events arrive.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      await supabase.realtime.setAuth(session?.access_token ?? null)
      if (cancelled) return

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          handleInsert,
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[notifications] realtime channel status:', status)
          }
        })
    }

    subscribe()

    // Keep the Realtime token fresh across token refreshes / re-auth so the
    // subscription doesn't go stale after the access token rotates.
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null)
    })

    return () => {
      cancelled = true
      authSub.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.read_at
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      )
      supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null)
        .then(() => {})
    },
    [supabase],
  )

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    )
    supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('recipient_id', userId)
      .is('read_at', null)
      .then(() => {})
  }, [supabase, userId])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  )

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, loading, markRead, markAllRead }),
    [notifications, unreadCount, loading, markRead, markAllRead],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
