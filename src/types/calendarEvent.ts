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
 * pintar cada dia que cubre en la vista mensual. */
export interface CalendarEventRange {
  id: number
  name: string
  detail: string | null
  code: string | null
  source: CalendarEventSource
  first_day: string
  last_day: string
}
