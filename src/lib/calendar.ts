/**
 * Genera las celdas de un grid de calendario mensual (semana empieza en domingo).
 * `null` representa celdas vacias antes del dia 1 o despues del ultimo dia,
 * para completar filas de 7 columnas.
 */
export function buildMonthGrid(date: Date): (number | null)[] {
  const year = date.getFullYear()
  const month = date.getMonth()

  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const trailing = (7 - (cells.length % 7)) % 7
  return [...cells, ...Array(trailing).fill(null)]
}
