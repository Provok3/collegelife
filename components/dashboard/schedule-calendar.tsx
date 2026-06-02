'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Trash2, BookOpen, FileText, Clock, MoreHorizontal } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek, isPast, startOfDay } from 'date-fns'

interface ScheduleItem {
  id: string
  owner_id: string
  title: string
  description: string | null
  item_type: 'study' | 'test' | 'assignment' | 'other'
  start_date: string
  end_date: string | null
  all_day: boolean
  created_at: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
}

interface ScheduleCalendarProps {
  items: ScheduleItem[]
  userId: string
  isOwner: boolean
}

const TYPE_CONFIG: Record<string, { icon: typeof Calendar; color: string; bg: string }> = {
  test: { icon: FileText, color: 'text-red-600', bg: 'bg-red-100' },
  assignment: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  study: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
  other: { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-100' },
}

function groupItemsByDate(items: ScheduleItem[]) {
  const groups: { label: string; items: ScheduleItem[] }[] = []
  const today = startOfDay(new Date())

  const upcoming = items.filter(item => !isPast(new Date(item.start_date)) || isToday(new Date(item.start_date)))
  const past = items.filter(item => isPast(new Date(item.start_date)) && !isToday(new Date(item.start_date)))

  // Group upcoming items
  const todayItems = upcoming.filter(item => isToday(new Date(item.start_date)))
  const tomorrowItems = upcoming.filter(item => isTomorrow(new Date(item.start_date)))
  const thisWeekItems = upcoming.filter(item => {
    const date = new Date(item.start_date)
    return isThisWeek(date) && !isToday(date) && !isTomorrow(date)
  })
  const laterItems = upcoming.filter(item => {
    const date = new Date(item.start_date)
    return !isThisWeek(date)
  })

  if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems })
  if (tomorrowItems.length > 0) groups.push({ label: 'Tomorrow', items: tomorrowItems })
  if (thisWeekItems.length > 0) groups.push({ label: 'This Week', items: thisWeekItems })
  if (laterItems.length > 0) groups.push({ label: 'Later', items: laterItems })
  if (past.length > 0) groups.push({ label: 'Past', items: past.slice(0, 5) })

  return groups
}

export function ScheduleCalendar({ items: initialItems, userId, isOwner }: ScheduleCalendarProps) {
  const [items, setItems] = useState(initialItems)

  // Keep the calendar in sync with refreshed server data — e.g. after adding a
  // new item, router.refresh() re-fetches and the new item arrives here.
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const { error } = await supabase
      .from('schedule_items')
      .delete()
      .eq('id', itemId)
      .eq('owner_id', userId)

    if (!error) {
      setItems(items.filter(i => i.id !== itemId))
    }
  }

  const groups = groupItemsByDate(items)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Schedule Items</h3>
          <p className="text-muted-foreground">
            {isOwner 
              ? 'Add your first test, assignment, or study session!' 
              : 'No upcoming events. Check back soon!'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{group.label}</h2>
          <div className="space-y-3">
            {group.items.map((item) => {
              const config = TYPE_CONFIG[item.item_type]
              const Icon = config.icon
              const startDate = new Date(item.start_date)
              const isPastItem = isPast(startDate) && !isToday(startDate)

              return (
                <Card key={item.id} className={isPastItem ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Type Icon */}
                      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="capitalize">
                                {item.item_type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {item.all_day 
                                  ? format(startDate, 'MMM d, yyyy')
                                  : format(startDate, 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          </div>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                        )}

                        {/* Owner info for viewers */}
                        {!isOwner && item.owner && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={item.owner.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {(item.owner.display_name || 'S').slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{item.owner.display_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
