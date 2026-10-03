/**
 * Fecha de hoy en YYYY-MM-DD, en hora local.
 * `new Date().toISOString()` convierte a UTC primero, lo que puede devolver
 * el dia equivocado cerca de la medianoche segun la zona horaria del usuario.
 */
export function todayIsoDate(): string {
  return formatIsoDate(new Date())
}

/** Misma logica que todayIsoDate pero para una fecha arbitraria (hora local). */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Dia de la semana ISO: 1=Lunes ... 7=Domingo (Date.getDay() usa 0=Domingo). */
export function isoWeekday(date: Date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

/** Nueva fecha (hora local) desplazada `days` dias respecto a `date`. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Parsea un "YYYY-MM-DD" como fecha local a medianoche (evita el corrimiento de un dia que da `new Date(str)`, que lo interpreta en UTC). */
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const MONTH_NAMES_EN = [
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

export const MONTH_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Formatea una fecha como "March 21, 2026" (fijo, sin depender del locale del navegador). */
export function formatDateLong(date: Date): string {
  return `${MONTH_NAMES_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** Formatea una fecha como "Mar 21" (fijo, sin anio: para labels compactos de grafico). */
export function formatShortDate(date: Date): string {
  return `${MONTH_SHORT_EN[date.getMonth()]} ${date.getDate()}`
}

/**
 * Convierte un input de texto a numero, aceptando "," o "." como separador decimal.
 * Devuelve null si el texto no es un numero valido.
 */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.')
  if (normalized === '') return null

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** Cantidad de dias del mes (monthIndex 0-11). El dia 0 del mes siguiente es el ultimo de este. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * Mueve una fecha ISO a otro mes del mismo anio conservando el dia; si ese
 * dia no existe en el mes destino (ej. 31 -> febrero) baja al ultimo dia valido.
 */
export function moveToMonth(isoDate: string, monthIndex: number): string {
  const [year, , day] = isoDate.split('-').map(Number)
  const clampedDay = Math.min(day, daysInMonth(year, monthIndex))
  return formatIsoDate(new Date(year, monthIndex, clampedDay))
}

/** Periodo (anio + mes 0-11) inmediatamente anterior; enero retrocede a diciembre del anio previo. */
export function previousMonth(
  year: number,
  monthIndex: number,
): { year: number; monthIndex: number } {
  return monthIndex === 0
    ? { year: year - 1, monthIndex: 11 }
    : { year, monthIndex: monthIndex - 1 }
}
