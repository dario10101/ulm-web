export type CalendarEventMarkerType = 'start' | 'end' | 'single'
export type CalendarEventSource = 'event' | 'user_event'

export interface CalendarEventMarker {
  id: number
  name: string
  detail: string | null
  marker_date: string
  marker_type: CalendarEventMarkerType
  source: CalendarEventSource
  code: string | null
}

/** Rango completo (sin recortar a inicio/fin) de un evento, usado para
 * pintar cada dia que cubre. */
export interface CalendarEventRange {
  id: number
  name: string
  detail: string | null
  code: string | null
  source: CalendarEventSource
  first_day: string
  last_day: string
  /** Solo los eventos personales (source 'user_event') tienen categoria. */
  category_id: number | null
}

/** Evento personal (cld_user_events): el unico tipo que el usuario edita. Los
 * festivos y fechas especiales los administra el admin. */
export interface UserEvent {
  id: number
  category_id: number
  /** Tipo del evento, siempre en mayusculas (lo garantiza el backend). */
  code: string
  first_day: string
  last_day: string
  name: string
  detail: string | null
}

export type UserEventPayload = Omit<UserEvent, 'id'>

export function isUserEvent(range: CalendarEventRange): boolean {
  return range.source === 'user_event'
}
