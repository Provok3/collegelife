export type CalendarSourceType = 'ical_file' | 'ical_url' | 'google' | 'office365'

export interface ParsedCalendarEvent {
  uid: string | null
  title: string
  description: string | null
  location: string | null
  externalUrl: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
}

interface IcsProperty {
  name: string
  value: string
}

function unfoldIcs(icsText: string) {
  return icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

function unescapeIcsValue(value: string) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

function parseProperty(line: string): IcsProperty | null {
  const separatorIndex = line.indexOf(':')
  if (separatorIndex === -1) return null

  const rawName = line.slice(0, separatorIndex)
  const name = rawName.split(';', 1)[0]?.toUpperCase()
  if (!name) return null

  return {
    name,
    value: unescapeIcsValue(line.slice(separatorIndex + 1)),
  }
}

function getProperty(properties: IcsProperty[], name: string) {
  return properties.find((property) => property.name === name)?.value ?? null
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } | null {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return {
      date: new Date(Number(year), Number(month) - 1, Number(day)),
      allDay: true,
    }
  }

  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value)
  if (!dateTime) return null

  const [, year, month, day, hour, minute, second = '00', zulu] = dateTime
  if (zulu) {
    return {
      date: new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        ),
      ),
      allDay: false,
    }
  }

  return {
    date: new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
    allDay: false,
  }
}

function normalizeAllDayEnd(endDate: Date | null) {
  if (!endDate) return null
  return new Date(endDate.getTime() - 1)
}

export function parseIcsEvents(icsText: string): ParsedCalendarEvent[] {
  const lines = unfoldIcs(icsText)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())

  const events: ParsedCalendarEvent[] = []
  let currentEvent: IcsProperty[] | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = []
      continue
    }

    if (line === 'END:VEVENT') {
      if (currentEvent) {
        const start = getProperty(currentEvent, 'DTSTART')
        const parsedStart = start ? parseIcsDate(start) : null
        if (parsedStart) {
          const end = getProperty(currentEvent, 'DTEND')
          const parsedEnd = end ? parseIcsDate(end) : null
          const allDay = parsedStart.allDay
          const endDate = allDay
            ? normalizeAllDayEnd(parsedEnd?.date ?? null)
            : parsedEnd?.date ?? null

          events.push({
            uid: getProperty(currentEvent, 'UID'),
            title: getProperty(currentEvent, 'SUMMARY') || 'Untitled event',
            description: getProperty(currentEvent, 'DESCRIPTION'),
            location: getProperty(currentEvent, 'LOCATION'),
            externalUrl: getProperty(currentEvent, 'URL'),
            startsAt: parsedStart.date.toISOString(),
            endsAt: endDate?.toISOString() ?? null,
            allDay,
          })
        }
      }
      currentEvent = null
      continue
    }

    if (currentEvent) {
      const property = parseProperty(line)
      if (property) currentEvent.push(property)
    }
  }

  return events
}
