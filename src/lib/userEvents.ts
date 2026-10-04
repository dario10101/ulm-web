/**
 * Eventos personales del calendario (cld_user_events): formulario y ubicacion
 * en las grillas.
 *
 * Logica pura (sin Vue ni red), probada en tests/userEvents.spec.ts.
 */

import { formatShortDate, parseIsoDate } from '@/lib/date'
import type { CalendarEventRange, UserEventPayload } from '@/types/calendarEvent'

// --- Tipo del evento (code) ---

/**
 * Forma canonica de un tipo: mayusculas y sin espacios sobrantes. Es la misma
 * regla que aplica el backend, asi el selector compara igual que la base.
 */
export function normalizeEventCode(raw: string): string {
  return raw.split(/\s+/).filter(Boolean).join(' ').toUpperCase()
}

/**
 * Tipos existentes que coinciden con lo que va escribiendo el usuario. Con el
 * campo vacio se ven todos; si no, los que contienen el texto (en cualquier
 * posicion: "TRIP" encuentra "BUSINESS TRIP").
 */
export function filterEventCodes(codes: string[], query: string): string[] {
  const needle = normalizeEventCode(query)
  return needle ? codes.filter((code) => code.includes(needle)) : codes
}

// --- Formulario (alta y edicion usan el mismo) ---

export interface EventFormFields {
  name: string
  code: string
  categoryId: number | null
  firstDay: string
  lastDay: string
  detail: string
}

export type EventFormValidation =
  { ok: false; error: string } | { ok: true; payload: UserEventPayload }

export function validateEventForm(fields: EventFormFields): EventFormValidation {
  const name = fields.name.trim()
  const code = normalizeEventCode(fields.code)
  if (!name) return { ok: false, error: 'Name is required.' }
  if (!code) return { ok: false, error: 'Pick an existing type or write a new one.' }
  if (fields.categoryId === null) return { ok: false, error: 'Pick a category.' }
  if (!fields.firstDay || !fields.lastDay) return { ok: false, error: 'Both dates are required.' }
  // YYYY-MM-DD ordena lexicograficamente igual que cronologicamente.
  if (fields.lastDay < fields.firstDay) {
    return { ok: false, error: 'The end date cannot be before the start date.' }
  }
  return {
    ok: true,
    payload: {
      name,
      code,
      category_id: fields.categoryId,
      first_day: fields.firstDay,
      last_day: fields.lastDay,
      detail: fields.detail.trim() || null,
    },
  }
}

// --- Presentacion ---

/** "Oct 5" para un dia, "Oct 5 – Oct 12" para un rango. */
export function eventDateLabel(range: Pick<CalendarEventRange, 'first_day' | 'last_day'>): string {
  const first = formatShortDate(parseIsoDate(range.first_day))
  if (range.first_day === range.last_day) return first
  return `${first} – ${formatShortDate(parseIsoDate(range.last_day))}`
}

/**
 * Orden de los eventos en las franjas "all day": festivos primero (son los
 * que mas condicionan el dia), despues por fecha de inicio y nombre.
 */
export function sortEventsForDisplay(ranges: CalendarEventRange[]): CalendarEventRange[] {
  return [...ranges].sort((a, b) => {
    const holidayA = a.code === 'HOLIDAY' ? 0 : 1
    const holidayB = b.code === 'HOLIDAY' ? 0 : 1
    return (
      holidayA - holidayB || a.first_day.localeCompare(b.first_day) || a.name.localeCompare(b.name)
    )
  })
}

// --- Vista semanal: un evento de varios dias es UNA barra que cruza columnas ---

export interface WeekEventBar {
  range: CalendarEventRange
  /** Columna inicial y final dentro de la semana (0 = lunes, 6 = domingo). */
  startColumn: number
  endColumn: number
  /** El evento sigue antes del lunes / despues del domingo de esta semana. */
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * Ubica cada evento que toca la semana como una barra, recortada a los dias
 * visibles. Las filas no se calculan aca: la grilla CSS ubica cada barra en la
 * primera fila donde entra (auto-placement), asi dos eventos solapados quedan
 * uno debajo del otro sin pisarse.
 */
export function weekEventBars(ranges: CalendarEventRange[], weekDays: string[]): WeekEventBar[] {
  const weekStart = weekDays[0]
  const weekEnd = weekDays[weekDays.length - 1]
  return sortEventsForDisplay(ranges)
    .filter((range) => range.first_day <= weekEnd && range.last_day >= weekStart)
    .map((range) => {
      const continuesBefore = range.first_day < weekStart
      const continuesAfter = range.last_day > weekEnd
      return {
        range,
        startColumn: continuesBefore ? 0 : weekDays.indexOf(range.first_day),
        endColumn: continuesAfter ? weekDays.length - 1 : weekDays.indexOf(range.last_day),
        continuesBefore,
        continuesAfter,
      }
    })
}
