/**
 * Grilla mensual y colores de eventos del calendario.
 *
 * Logica pura compartida por la vista mensual (el mes mostrado) y por cada uno
 * de los 12 mini-meses de la vista anual. No toca Vue ni el DOM.
 *
 * (Distinto de `lib/calendar.ts`, que arma una grilla simple de numeros para el
 * widget del dashboard y empieza la semana en domingo.)
 */

import { addDays, formatIsoDate, isoWeekday, parseIsoDate } from '@/lib/date'
import type { CalendarEventRange } from '@/types/calendarEvent'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface MonthGridDay {
  isoDate: string
  dayNumber: number
  inMonth: boolean
}

export interface MonthCellVisuals {
  tintColor: string
  stripeColors: string[]
}

/** Lunes de la semana a la que pertenece esa fecha. */
export function mondayOf(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(addDays(d, -(isoWeekday(d) - 1)))
}

export function firstOfMonth(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function lastOfMonth(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/**
 * Celdas de la grilla de un mes, de lunes a domingo, incluyendo los dias de
 * los meses vecinos que completan la primera y la ultima semana
 * (`inMonth: false`).
 */
export function computeMonthGridDays(monthStartIso: string): MonthGridDay[] {
  const monthIndex = parseIsoDate(monthStartIso).getMonth()
  const gridStart = parseIsoDate(mondayOf(monthStartIso))
  const gridEnd = addDays(parseIsoDate(mondayOf(lastOfMonth(monthStartIso))), 6)

  const days: MonthGridDay[] = []
  for (let current = gridStart; current <= gridEnd; current = addDays(current, 1)) {
    days.push({
      isoDate: formatIsoDate(current),
      dayNumber: current.getDate(),
      inMonth: current.getMonth() === monthIndex,
    })
  }
  return days
}

/**
 * Paleta de eventos. El indice 0 (naranja) queda reservado para festivos; el
 * resto se asigna de forma ESTABLE por id de evento (no por su posicion dentro
 * de un dia puntual), para que un mismo evento se vea siempre del mismo color
 * sin importar el dia o con que otro se cruce.
 *
 * En hex y no en clases de Tailwind, para poder combinarlos con un canal de
 * alpha propio via `:style` sin depender del escaneo estatico de clases.
 */
const EVENT_COLORS = ['#f97316', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b']

export function eventColor(range: CalendarEventRange): string {
  if (range.code === 'HOLIDAY') return EVENT_COLORS[0]
  return EVENT_COLORS[1 + (range.id % (EVENT_COLORS.length - 1))]
}

/** Agrega un canal de alpha (2 digitos hex) a un color "#rrggbb". */
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`
}

/**
 * Fondo de una celda a partir de los eventos que la cubren: el color del
 * primero (festivo siempre primero, y siempre naranja), y el resto como rayas
 * verticales a la izquierda, una por evento, para que ninguno quede
 * completamente oculto detras del fondo.
 *
 * Si hay mas eventos que colores disponibles, los de mas se descartan
 * (permitido explicitamente).
 */
export function computeCellVisuals(ranges: CalendarEventRange[]): MonthCellVisuals {
  if (!ranges.length) return { tintColor: '', stripeColors: [] }

  const holiday = ranges.find((r) => r.code === 'HOLIDAY')
  const primary = holiday ?? ranges[0]
  const rest = ranges.filter((r) => r !== primary).slice(0, EVENT_COLORS.length - 1)

  return { tintColor: eventColor(primary), stripeColors: rest.map((r) => eventColor(r)) }
}

/** Eventos que cubren ese dia, de una lista de rangos ya cargada. */
export function rangesCovering(ranges: CalendarEventRange[], dayIso: string): CalendarEventRange[] {
  return ranges.filter((range) => range.first_day <= dayIso && dayIso <= range.last_day)
}
