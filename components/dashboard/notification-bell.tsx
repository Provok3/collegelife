'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Copy, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { payMethodsFromData } from '@/lib/payments'
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
  const isMoneyRequest = notification.type === 'money_request'

  const header = (
    <>
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
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </>
  )

  return (
    <li
      className={cn(
        'group relative flex gap-3 px-4 py-3 transition-colors',
        !isMoneyRequest && 'hover:bg-muted/60',
        unread && 'bg-primary/5',
      )}
    >
      {isMoneyRequest ? (
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-start gap-3">{header}</div>
          <MoneyRequestActions notification={notification} />
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-1 items-start gap-3 text-left"
        >
          {header}
        </button>
      )}
      {unread && (
        <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-primary group-hover:opacity-0" />
      )}
    </li>
  )
}

function MoneyRequestActions({ notification }: { notification: AppNotification }) {
  const methods = payMethodsFromData(
    notification.data,
    Number(notification.data?.amount ?? 0),
    notification.data?.note,
  )

  const copyHandle = async (label: string, handle: string) => {
    try {
      await navigator.clipboard.writeText(handle)
      toast.success(`${label} handle copied: ${handle}`)
    } catch {
      toast.error('Could not copy. Handle: ' + handle)
    }
  }

  if (methods.length === 0) {
    return (
      <p className="pl-12 text-xs text-muted-foreground">
        No payment method on file yet.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 pl-12">
      {methods.map((method) =>
        method.href ? (
          <Button key={method.key} asChild size="sm" variant="secondary">
            <a href={method.href} target="_blank" rel="noopener noreferrer">
              {method.label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <Button
            key={method.key}
            size="sm"
            variant="outline"
            onClick={() => copyHandle(method.label, method.handle)}
          >
            {method.label}
            <Copy className="h-3.5 w-3.5" />
          </Button>
        ),
      )}
    </div>
  )
}
