import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type {
  CalendarEventMarker,
  CalendarEventRange,
  UserEvent,
  UserEventPayload,
} from '@/types/calendarEvent'

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

/** Tipos que el usuario ya uso, ordenados (para el selector del formulario). */
export function listUserEventCodes(): Promise<string[]> {
  return getJson<string[]>('/calendar-events/user-event-codes')
}

export function createUserEvent(payload: UserEventPayload): Promise<UserEvent> {
  return postJson<UserEvent>('/calendar-events/user-events', payload)
}

export function updateUserEvent(id: number, payload: UserEventPayload): Promise<UserEvent> {
  return putJson<UserEvent>(`/calendar-events/user-events/${id}`, payload)
}

export function deleteUserEvent(id: number): Promise<void> {
  return deleteJson<void>(`/calendar-events/user-events/${id}`)
}
