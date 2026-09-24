/**
 * Tipos de evento del calendario, usados por el filtro de la vista anual.
 *
 * La lista es fija (no se deriva de los datos) para que el menu no cambie de
 * forma al navegar entre anios. Un `code` que llegue de la base y no este en
 * `KNOWN_EVENT_CODES` — incluido `null` — cae en "Others".
 */

import type { CalendarEventRange } from '@/types/calendarEvent'

export type EventTypeValue =
  'HOLIDAY' | 'SPECIAL_DATE' | 'TRAVEL' | 'VACATION' | 'BIRTHDAY' | 'OTHERS'

export const EVENT_TYPE_OPTIONS: { value: EventTypeValue; label: string }[] = [
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'SPECIAL_DATE', label: 'Special date' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'OTHERS', label: 'Others' },
]

const KNOWN_EVENT_CODES: string[] = ['HOLIDAY', 'SPECIAL_DATE', 'TRAVEL', 'VACATION', 'BIRTHDAY']

export function normalizedEventCode(range: CalendarEventRange): EventTypeValue {
  return range.code && KNOWN_EVENT_CODES.includes(range.code)
    ? (range.code as EventTypeValue)
    : 'OTHERS'
}

/** Todos los tipos marcados: es el estado inicial del filtro. */
export function allEventTypes(): Set<EventTypeValue> {
  return new Set(EVENT_TYPE_OPTIONS.map((option) => option.value))
}
