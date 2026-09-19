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

/**
 * Rango por defecto para crear la semana del checklist: sabado a viernes.
 * Si hoy es sabado, arranca hoy; si no, retrocede hasta el sabado anterior.
 */
export function defaultWeekRange(today: Date = new Date()): { firstDay: string; lastDay: string } {
  const daysSinceSaturday = (today.getDay() - 6 + 7) % 7
  const firstDay = new Date(today)
  firstDay.setDate(today.getDate() - daysSinceSaturday)
  const lastDay = new Date(firstDay)
  lastDay.setDate(firstDay.getDate() + 6)
  return { firstDay: formatIsoDate(firstDay), lastDay: formatIsoDate(lastDay) }
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
