import { getJson } from '@/lib/http'
import type { CalendarEventMarker, CalendarEventRange } from '@/types/calendarEvent'

export function listCalendarEvents(
  firstDay: string,
  lastDay: string,
): Promise<CalendarEventMarker[]> {
  return getJson<CalendarEventMarker[]>(
    `/calendar-events?first_day=${firstDay}&last_day=${lastDay}`,
  )
}

export function listCalendarEventRanges(
  firstDay: string,
  lastDay: string,
): Promise<CalendarEventRange[]> {
  return getJson<CalendarEventRange[]>(
    `/calendar-events/ranges?first_day=${firstDay}&last_day=${lastDay}`,
  )
}
