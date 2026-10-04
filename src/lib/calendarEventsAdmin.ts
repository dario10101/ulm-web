import type { CalendarYear, CldEvent, OfficialHoliday } from '@/types/params'

/**
 * Filas del panel de festivos: los eventos cargados mas los festivos oficiales
 * que faltan (como sugerencia), ordenados por fecha y agrupados por mes.
 */
export type CalendarRow =
  | { kind: 'event'; key: string; day: string; event: CldEvent; official: boolean }
  | { kind: 'missing'; key: string; day: string; holiday: OfficialHoliday }

export interface CalendarMonthGroup {
  /** "2026-01" */
  month: string
  rows: CalendarRow[]
}

export function calendarRows(year: CalendarYear): CalendarRow[] {
  const officialEventIds = new Set(
    year.official_holidays.flatMap((h) => (h.event_id === null ? [] : [h.event_id])),
  )
  const rows: CalendarRow[] = [
    ...year.events.map((event) => ({
      kind: 'event' as const,
      key: `event-${event.id}`,
      // Un evento que empezo el año anterior se ubica en el 1 de enero.
      day: event.first_day < `${year.year}-01-01` ? `${year.year}-01-01` : event.first_day,
      event,
      official: officialEventIds.has(event.id),
    })),
    ...year.official_holidays
      .filter((h) => h.event_id === null)
      .map((holiday) => ({
        kind: 'missing' as const,
        key: `missing-${holiday.day}`,
        day: holiday.day,
        holiday,
      })),
  ]
  return rows.sort((a, b) => a.day.localeCompare(b.day) || a.key.localeCompare(b.key))
}

export function groupByMonth(rows: CalendarRow[]): CalendarMonthGroup[] {
  const groups: CalendarMonthGroup[] = []
  for (const row of rows) {
    const month = row.day.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last?.month === month) last.rows.push(row)
    else groups.push({ month, rows: [row] })
  }
  return groups
}

export function missingCount(year: CalendarYear): number {
  return year.official_holidays.filter((h) => h.event_id === null).length
}
