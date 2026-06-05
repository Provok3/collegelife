import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIcsEvents, type CalendarSourceType } from '@/lib/schedule/ics'

const MAX_ICS_CHARS = 2_000_000
const MAX_EVENTS_PER_IMPORT = 500

type ImportRequest = {
  sourceId?: string
  sourceType?: CalendarSourceType
  name?: string
  url?: string
  icsText?: string
  reminderMinutes?: number[]
}

function isCalendarSourceType(value: unknown): value is CalendarSourceType {
  return (
    value === 'ical_file' ||
    value === 'ical_url' ||
    value === 'google' ||
    value === 'office365'
  )
}

function normalizeReminderMinutes(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((minutes) => Number(minutes))
    .filter((minutes) => Number.isInteger(minutes) && minutes >= 0 && minutes <= 10_080)
    .slice(0, 5)
}

function validateRemoteUrl(rawUrl: string) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const hostname = url.hostname.toLowerCase()
  const privateHostPattern =
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|::1$)|^172\.(1[6-9]|2\d|3[0-1])\.|\.local$/
  if (privateHostPattern.test(hostname)) return null

  return url.toString()
}

async function fetchIcs(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/calendar,text/plain,*/*',
      'user-agent': 'CollegeLife calendar importer',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Calendar feed returned ${response.status}`)
  }

  const text = await response.text()
  if (text.length > MAX_ICS_CHARS) {
    throw new Error('Calendar feed is too large')
  }

  return text
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ImportRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const reminderMinutes = normalizeReminderMinutes(body.reminderMinutes)
  let sourceId = body.sourceId
  let sourceType = body.sourceType
  let sourceName = body.name?.trim() || 'Imported calendar'
  let sourceUrl = body.url?.trim() || null
  let icsText = body.icsText

  if (sourceId) {
    const { data: source, error } = await supabase
      .from('calendar_sources')
      .select('id, name, source_type, source_url')
      .eq('id', sourceId)
      .eq('owner_id', user.id)
      .single()

    if (error || !source) {
      return NextResponse.json({ error: 'Calendar source not found' }, { status: 404 })
    }

    sourceName = source.name
    sourceType = source.source_type as CalendarSourceType
    sourceUrl = source.source_url
  }

  if (!isCalendarSourceType(sourceType)) {
    return NextResponse.json({ error: 'Choose a calendar source type' }, { status: 400 })
  }

  if (sourceUrl) {
    const validUrl = validateRemoteUrl(sourceUrl)
    if (!validUrl) {
      return NextResponse.json({ error: 'Enter a valid calendar URL' }, { status: 400 })
    }
    sourceUrl = validUrl
    try {
      icsText = await fetchIcs(sourceUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch calendar'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  if (!icsText?.trim()) {
    return NextResponse.json({ error: 'Calendar file is empty' }, { status: 400 })
  }

  if (icsText.length > MAX_ICS_CHARS) {
    return NextResponse.json({ error: 'Calendar file is too large' }, { status: 400 })
  }

  const parsedEvents = parseIcsEvents(icsText).slice(0, MAX_EVENTS_PER_IMPORT)
  if (parsedEvents.length === 0) {
    return NextResponse.json({ error: 'No events were found in that calendar' }, { status: 400 })
  }

  if (!sourceId) {
    const { data: source, error } = await supabase
      .from('calendar_sources')
      .insert({
        owner_id: user.id,
        name: sourceName,
        source_type: sourceType,
        source_url: sourceUrl,
        color: '#1a73e8',
      })
      .select('id')
      .single()

    if (error || !source) {
      return NextResponse.json({ error: 'Unable to save calendar source' }, { status: 400 })
    }

    sourceId = source.id
  }

  await supabase
    .from('schedule_items')
    .delete()
    .eq('owner_id', user.id)
    .eq('calendar_source_id', sourceId)

  const rows = parsedEvents.map((event) => ({
    owner_id: user.id,
    title: event.title,
    description: event.description,
    item_type: 'other',
    start_date: event.startsAt,
    end_date: event.endsAt,
    all_day: event.allDay,
    reminder_minutes: reminderMinutes,
    calendar_source_id: sourceId,
    import_source: sourceType,
    external_uid: event.uid,
    external_url: event.externalUrl,
    location: event.location,
  }))

  const { error: insertError } = await supabase.from('schedule_items').insert(rows)
  if (insertError) {
    return NextResponse.json({ error: 'Unable to import calendar events' }, { status: 400 })
  }

  await supabase
    .from('calendar_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', sourceId)
    .eq('owner_id', user.id)

  return NextResponse.json({
    imported: rows.length,
    sourceId,
  })
}
