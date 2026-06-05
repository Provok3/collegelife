'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  LinkIcon,
  MapPin,
  MoreHorizontal,
  PartyPopper,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

type ScheduleItemType = 'class' | 'study' | 'test' | 'assignment' | 'work' | 'social' | 'other'
type CalendarSourceType = 'ical_file' | 'ical_url' | 'google' | 'office365'

interface ScheduleItem {
  id: string
  owner_id: string
  title: string
  description: string | null
  item_type: ScheduleItemType
  start_date: string
  end_date: string | null
  all_day: boolean
  created_at: string
  reminder_minutes?: number[] | null
  calendar_source_id?: string | null
  import_source?: CalendarSourceType | null
  external_url?: string | null
  location?: string | null
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
}

interface CalendarSource {
  id: string
  owner_id: string
  name: string
  source_type: CalendarSourceType
  source_url: string | null
  color: string
  last_synced_at: string | null
  created_at: string
}

interface ScheduleCalendarProps {
  items: ScheduleItem[]
  sources?: CalendarSource[]
  userId: string
  isOwner: boolean
}

const ITEM_TYPES: Array<{
  value: ScheduleItemType
  label: string
  icon: typeof CalendarDays
  className: string
}> = [
  { value: 'class', label: 'Class', icon: GraduationCap, className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200' },
  { value: 'study', label: 'Study', icon: BookOpen, className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' },
  { value: 'test', label: 'Test', icon: FileText, className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-200' },
  { value: 'assignment', label: 'Assignment', icon: Clock, className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' },
  { value: 'work', label: 'Work', icon: Briefcase, className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' },
  { value: 'social', label: 'Social', icon: PartyPopper, className: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:bg-pink-500/15 dark:text-pink-200' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, className: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200' },
]

const SOURCE_TYPES: Array<{ value: CalendarSourceType; label: string }> = [
  { value: 'ical_file', label: 'iCal file' },
  { value: 'ical_url', label: 'iCal URL' },
  { value: 'google', label: 'Google Calendar' },
  { value: 'office365', label: 'Office 365' },
]

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'At event time' },
  { value: '10', label: '10 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 15-minute increments across the day, e.g. { value: '09:15', label: '9:15 AM' }
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4)
  const minutes = (index % 4) * 15
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return { value, label: format(new Date(`2000-01-01T${value}:00`), 'h:mm a') }
})

function DatePickerField({
  id,
  value,
  placeholder,
  onSelect,
  invalid,
  required,
}: {
  id: string
  value: string
  placeholder: string
  onSelect: (value: string) => void
  invalid?: boolean
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  const hasValidDate = selected && !Number.isNaN(selected.getTime())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          aria-required={required}
          className="w-full justify-start text-left font-normal"
        >
          <CalendarDays className="mr-2 size-4 text-muted-foreground" />
          {hasValidDate ? (
            format(selected, 'EEE, MMM d, yyyy')
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={hasValidDate ? selected : undefined}
          defaultMonth={hasValidDate ? selected : undefined}
          onSelect={(date) => {
            if (date) {
              onSelect(toDateInputValue(date))
              setOpen(false)
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function TimePickerField({
  id,
  value,
  onSelect,
  invalid,
}: {
  id: string
  value: string
  onSelect: (value: string) => void
  invalid?: boolean
}) {
  return (
    <Select value={value} onValueChange={onSelect}>
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <span className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Pick a time" />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function typeConfig(type: ScheduleItemType) {
  return ITEM_TYPES.find((itemType) => itemType.value === type) ?? ITEM_TYPES[ITEM_TYPES.length - 1]
}

function toDateInputValue(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function itemRange(item: ScheduleItem) {
  const start = parseISO(item.start_date)
  const end = item.end_date ? parseISO(item.end_date) : start
  return { start, end }
}

function itemOccursOnDate(item: ScheduleItem, date: Date) {
  const { start, end } = itemRange(item)
  return isWithinInterval(date, {
    start: startOfDay(start),
    end: endOfDay(end),
  })
}

function formatEventTime(item: ScheduleItem) {
  const start = parseISO(item.start_date)
  if (item.all_day) return 'All day'

  if (!item.end_date) return format(start, 'h:mm a')

  const end = parseISO(item.end_date)
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
}

function reminderLabel(minutes: number) {
  if (minutes === 0) return 'At event time'
  if (minutes < 60) return `${minutes} min before`
  if (minutes === 60) return '1 hour before'
  if (minutes === 1440) return '1 day before'
  return `${minutes} min before`
}

function combineDateAndTime(dateValue: string, timeValue: string, allDay: boolean, endOfDate: boolean) {
  if (allDay) {
    return new Date(`${dateValue}T${endOfDate ? '23:59:59' : '00:00:00'}`).toISOString()
  }

  return new Date(`${dateValue}T${timeValue || (endOfDate ? '23:59' : '09:00')}`).toISOString()
}

function formatDateInputLabel(dateValue: string) {
  if (!dateValue) return 'Choose a start date'
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Choose a start date'
  return format(date, 'EEEE, MMMM d')
}

function endIsBeforeStart({
  startDate,
  startTime,
  endDate,
  endTime,
  allDay,
}: {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
}) {
  if (!startDate || !endDate) return false

  const start = new Date(`${startDate}T${allDay ? '00:00:00' : startTime || '09:00'}`)
  const end = new Date(`${endDate}T${allDay ? '23:59:59' : endTime || '23:59'}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false

  return end < start
}

export function ScheduleCalendar({
  items: initialItems,
  sources: initialSources = [],
  userId,
  isOwner,
}: ScheduleCalendarProps) {
  const [items, setItems] = useState(initialItems)
  const [sources, setSources] = useState(initialSources)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()))
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [itemType, setItemType] = useState<ScheduleItemType>('study')
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()))
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [reminderMinutes, setReminderMinutes] = useState('30')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sourceType, setSourceType] = useState<CalendarSourceType>('ical_url')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [icsText, setIcsText] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [importReminderMinutes, setImportReminderMinutes] = useState('none')
  const [isImporting, setIsImporting] = useState(false)
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null)
  const reminderTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    setSources(initialSources)
  }, [initialSources])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    [items],
  )

  const eventEndBeforeStart = endIsBeforeStart({
    startDate,
    startTime,
    endDate,
    endTime,
    allDay,
  })

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth))
    const end = endOfWeek(endOfMonth(visibleMonth))
    const days: Date[] = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [visibleMonth])

  const upcomingItems = useMemo(() => {
    const now = new Date()
    return sortedItems
      .filter((item) => !isPast(parseISO(item.end_date ?? item.start_date)) || isSameDay(parseISO(item.start_date), now))
      .slice(0, 8)
  }, [sortedItems])

  useEffect(() => {
    reminderTimeouts.current.forEach(clearTimeout)
    reminderTimeouts.current = []

    if (!isOwner || typeof window === 'undefined') return

    const now = Date.now()
    const maxDelay = 2_147_483_647
    for (const item of items) {
      const reminders = item.reminder_minutes ?? []
      for (const minutes of reminders) {
        const triggerAt = new Date(item.start_date).getTime() - minutes * 60_000
        const delay = triggerAt - now
        if (delay <= 0 || delay > maxDelay) continue

        const timeout = setTimeout(() => {
          const body = minutes === 0 ? 'Starts now' : `Starts in ${reminderLabel(minutes).toLowerCase().replace(' before', '')}`
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(item.title, { body })
          } else {
            toast(`${item.title}: ${body}`)
          }
        }, delay)
        reminderTimeouts.current.push(timeout)
      }
    }

    return () => {
      reminderTimeouts.current.forEach(clearTimeout)
      reminderTimeouts.current = []
    }
  }, [items, isOwner])

  const openCreateDialog = (date: Date) => {
    if (!isOwner) return

    const dateValue = toDateInputValue(date)
    setTitle('')
    setDescription('')
    setLocation('')
    setItemType('study')
    setStartDate(dateValue)
    setEndDate(dateValue)
    setStartTime('09:00')
    setEndTime('10:00')
    setAllDay(false)
    setReminderMinutes('30')
    setEventDialogOpen(true)
  }

  const requestNotificationPermission = async () => {
    if (reminderMinutes === 'none' || typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !startDate || eventEndBeforeStart) return

    setIsSubmitting(true)
    await requestNotificationPermission()

    const startDateTime = combineDateAndTime(startDate, startTime, allDay, false)
    const endDateTime = endDate ? combineDateAndTime(endDate, endTime, allDay, true) : null
    const reminders = reminderMinutes === 'none' ? [] : [Number(reminderMinutes)]

    const { data, error } = await supabase
      .from('schedule_items')
      .insert({
        owner_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        item_type: itemType,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: allDay,
        reminder_minutes: reminders,
      })
      .select('*')
      .single()

    setIsSubmitting(false)

    if (error) {
      toast.error('Unable to add event')
      return
    }

    if (data) setItems((current) => [...current, data as ScheduleItem])
    setEventDialogOpen(false)
    router.refresh()
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this event?')) return

    const { error } = await supabase
      .from('schedule_items')
      .delete()
      .eq('id', itemId)
      .eq('owner_id', userId)

    if (error) {
      toast.error('Unable to delete event')
      return
    }

    setItems((current) => current.filter((item) => item.id !== itemId))
    router.refresh()
  }

  const importReminderPayload = importReminderMinutes === 'none' ? [] : [Number(importReminderMinutes)]

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault()

    setIsImporting(true)
    const response = await fetch('/api/schedule/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceType,
        name: sourceName.trim() || selectedFileName || 'Imported calendar',
        url: sourceType === 'ical_file' ? undefined : sourceUrl.trim(),
        icsText: sourceType === 'ical_file' ? icsText : undefined,
        reminderMinutes: importReminderPayload,
      }),
    })
    const result = await response.json()
    setIsImporting(false)

    if (!response.ok) {
      toast.error(result.error || 'Unable to import calendar')
      return
    }

    toast.success(`Imported ${result.imported} events`)
    setImportDialogOpen(false)
    setSourceName('')
    setSourceUrl('')
    setIcsText('')
    setSelectedFileName('')
    router.refresh()
  }

  const handleRefreshSource = async (source: CalendarSource) => {
    if (!source.source_url) return

    setSyncingSourceId(source.id)
    const response = await fetch('/api/schedule/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId: source.id }),
    })
    const result = await response.json()
    setSyncingSourceId(null)

    if (!response.ok) {
      toast.error(result.error || 'Unable to refresh calendar')
      return
    }

    toast.success(`Synced ${result.imported} events`)
    router.refresh()
  }

  const handleDeleteSource = async (source: CalendarSource) => {
    if (!confirm(`Remove ${source.name} and its imported events?`)) return

    const { error } = await supabase
      .from('calendar_sources')
      .delete()
      .eq('id', source.id)
      .eq('owner_id', userId)

    if (error) {
      toast.error('Unable to remove calendar')
      return
    }

    setSources((current) => current.filter((item) => item.id !== source.id))
    setItems((current) => current.filter((item) => item.calendar_source_id !== source.id))
    router.refresh()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    if (!sourceName.trim()) setSourceName(file.name.replace(/\.ics$/i, ''))
    setIcsText(await file.text())
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => setVisibleMonth(subMonths(visibleMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <h2 className="min-w-40 text-lg font-semibold" aria-live="polite">
              {format(visibleMonth, 'MMMM yyyy')}
            </h2>
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openCreateDialog(new Date())}>
                <CalendarDays className="h-4 w-4" />
                New event
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const dayItems = sortedItems.filter((item) => itemOccursOnDate(item, day))
                const hiddenCount = Math.max(dayItems.length - 3, 0)
                const dayLabel = [
                  format(day, 'EEEE, MMMM d, yyyy'),
                  dayItems.length === 1 ? '1 event' : `${dayItems.length} events`,
                  isOwner ? 'select to add an event' : '',
                ].filter(Boolean).join(', ')

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={!isOwner}
                    aria-label={dayLabel}
                    onClick={() => openCreateDialog(day)}
                    className="group min-h-32 border-b border-r border-border p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-100"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={[
                          'flex h-7 w-7 items-center justify-center rounded-full text-sm',
                          isToday(day) ? 'bg-primary text-primary-foreground' : '',
                          !isSameMonth(day, visibleMonth) ? 'text-muted-foreground' : 'text-foreground',
                        ].join(' ')}
                      >
                        {format(day, 'd')}
                      </span>
                      {isOwner && (
                        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          Add
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => {
                        const config = typeConfig(item.item_type)
                        return (
                          <div
                            key={item.id}
                            className={`truncate rounded-md border px-2 py-1 text-xs font-medium ${config.className}`}
                          >
                            {!item.all_day && <span className="mr-1 tabular-nums">{format(parseISO(item.start_date), 'h:mm')}</span>}
                            {item.title}
                          </div>
                        )
                      })}
                      {hiddenCount > 0 && (
                        <div className="px-2 text-xs text-muted-foreground">+{hiddenCount} more</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Upcoming</h2>
            <Badge variant="outline">{upcomingItems.length}</Badge>
          </div>
          {upcomingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isOwner ? 'Select a day to add your first event.' : 'No upcoming events.'}
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => {
                const config = typeConfig(item.item_type)
                const Icon = config.icon
                return (
                  <div key={item.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-md border p-2 ${config.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(parseISO(item.start_date), 'EEE, MMM d')} · {formatEventTime(item)}
                            </p>
                          </div>
                          {isOwner && item.owner_id === userId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${item.title}`}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {item.location && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </p>
                        )}
                        {(item.reminder_minutes?.length ?? 0) > 0 && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Bell className="h-3 w-3" />
                            {item.reminder_minutes?.map(reminderLabel).join(', ')}
                          </p>
                        )}
                        {!isOwner && item.owner && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.owner.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(item.owner.display_name || 'S').slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{item.owner.display_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {isOwner && (
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Calendars</h2>
              <Button variant="ghost" size="sm" onClick={() => setImportDialogOpen(true)}>
                <LinkIcon className="h-4 w-4" />
                Add
              </Button>
            </div>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imported calendars.</p>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div key={source.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{source.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {SOURCE_TYPES.find((type) => type.value === source.source_type)?.label}
                          {source.last_synced_at ? ` · ${format(parseISO(source.last_synced_at), 'MMM d, h:mm a')}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!source.source_url || syncingSourceId === source.id}
                          aria-label={`Refresh ${source.name}`}
                          onClick={() => handleRefreshSource(source)}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncingSourceId === source.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${source.name}`}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSource(source)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </aside>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>{formatDateInputLabel(startDate)}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Label htmlFor="event-title" className="sr-only">
              Event title
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add title"
              className="h-12 text-lg font-medium"
              autoFocus
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-type">Type</Label>
                <Select value={itemType} onValueChange={(value) => setItemType(value as ScheduleItemType)}>
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder">Reminder</Label>
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger id="reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="all-day" checked={allDay} onCheckedChange={(checked) => setAllDay(checked === true)} />
              <Label htmlFor="all-day" className="text-sm font-normal">
                All day
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="start-date">Starts</Label>
                <DatePickerField
                  id="start-date"
                  value={startDate}
                  placeholder="Pick a start date"
                  required
                  onSelect={(nextStartDate) => {
                    setStartDate(nextStartDate)
                    if (endDate && nextStartDate && endDate < nextStartDate) {
                      setEndDate(nextStartDate)
                    }
                  }}
                />
              </div>
              {!allDay && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="start-time">Time</Label>
                  <TimePickerField id="start-time" value={startTime} onSelect={setStartTime} />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="end-date">Ends</Label>
                <DatePickerField
                  id="end-date"
                  value={endDate}
                  placeholder="Pick an end date"
                  invalid={eventEndBeforeStart}
                  onSelect={setEndDate}
                />
              </div>
              {!allDay && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="end-time">Time</Label>
                  <TimePickerField id="end-time" value={endTime} onSelect={setEndTime} invalid={eventEndBeforeStart} />
                </div>
              )}
            </div>
            {eventEndBeforeStart && (
              <p id="event-date-error" className="text-sm text-destructive">
                End time must be after the start time.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Classroom, library, office" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !startDate || eventEndBeforeStart || isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import calendar</DialogTitle>
            <DialogDescription>Add iCal, Google Calendar, or Office 365 events.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source-type">Source</Label>
                <Select value={sourceType} onValueChange={(value) => setSourceType(value as CalendarSourceType)}>
                  <SelectTrigger id="source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-name">Name</Label>
                <Input id="source-name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="School calendar" />
              </div>
            </div>

            {sourceType === 'ical_file' ? (
              <div className="space-y-2">
                <Label htmlFor="ics-file">iCal file</Label>
                <Input id="ics-file" type="file" accept=".ics,text/calendar" onChange={handleFileChange} required />
                {selectedFileName && <p className="text-xs text-muted-foreground">{selectedFileName}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="source-url">Calendar URL</Label>
                <Input
                  id="source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="import-reminder">Default reminder</Label>
              <Select value={importReminderMinutes} onValueChange={setImportReminderMinutes}>
                <SelectTrigger id="import-reminder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isImporting ||
                  (sourceType === 'ical_file' ? !icsText : !sourceUrl.trim())
                }
              >
                {isImporting ? 'Importing...' : 'Import calendar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
