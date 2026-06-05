'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useNotifications } from './notifications-provider'
import { describeNotification, type AppNotification } from '@/lib/notifications'

export function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, clearUnreadNotifications } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  const visible = useMemo(
    () => (tab === 'unread' ? notifications.filter((n) => !n.read_at) : notifications),
    [notifications, tab],
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTab('all')
      if (unreadCount > 0) {
        clearUnreadNotifications()
      }
    }
  }

  const handleOpen = (n: AppNotification) => {
    setOpen(false)
    router.push(describeNotification(n).href)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px] tabular-nums"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
          <div className="px-3 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[22rem]">
            {visible.length === 0 ? (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Bell />
                  </EmptyMedia>
                  <EmptyTitle>
                    {tab === 'unread' ? 'All caught up' : 'No notifications yet'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {tab === 'unread'
                      ? "You've read everything. Nice work!"
                      : 'Reactions, comments, and new posts will show up here.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {visible.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onOpen={() => handleOpen(n)}
                  />
                ))}
              </ul>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification
  onOpen: () => void
}) {
  const { icon: Icon, title, detail } = describeNotification(notification)
  const unread = !notification.read_at
  const actorName = notification.actor?.display_name?.trim() || 'Someone'
  const initials = actorName.slice(0, 2).toUpperCase()

  return (
    <li
      className={cn(
        'group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60',
        unread && 'bg-primary/5',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-start gap-3 text-left"
      >
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={notification.actor?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <Icon className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">{title}</p>
          {detail && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {detail}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </button>
      {unread && (
        <span className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary group-hover:opacity-0" />
      )}
    </li>
  )
}
