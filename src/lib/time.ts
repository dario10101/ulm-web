/**
 * Helpers de hora para el calendario.
 *
 * Contrato de zona horaria con la API (ver ulm-core/app/services/cld_task_sync.py):
 * el front NO hace cuentas de zona. Manda y recibe "hora de pared" del usuario
 * (un string sin `Z` ni offset, ej. "2026-09-15T19:30:00"); el backend conoce
 * `users.timezone` y se encarga de convertir a/desde UTC para guardar.
 *
 * Por que no `toISOString()`: convierte usando la zona del NAVEGADOR, que no
 * tiene por que ser la del usuario (basta con abrir la app de viaje). El
 * backend rechaza con 422 cualquier fecha que llegue con offset.
 */

import { addDays, formatIsoDate, isoWeekday } from '@/lib/date'

/**
 * Date -> "YYYY-MM-DDTHH:MM:SS" en hora local, sin zona.
 * Es el formato que la API espera en `scheduled_date` y `repeat_date`.
 */
export function formatLocalDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatIsoDate(date)}T${hours}:${minutes}:00`
}

/**
 * Parsea la hora de pared que devuelve la API.
 *
 * Un string de fecha+hora sin offset lo interpreta JavaScript como hora local
 * tal cual, que es justo lo que queremos: los digitos que manda el backend son
 * los que hay que pintar, sin convertir nada.
 *
 * (Ojo con la asimetria del estandar: un string de SOLO fecha, "2026-09-15",
 * si se interpreta como UTC. Para eso esta `parseIsoDate` en lib/date.ts.)
 */
export function parseLocalDateTime(value: string): Date {
  return new Date(value)
}

// --- Reloj de 12 horas y armado de fechas (compartido por QuickAddPage y el
// formulario de tareas del calendario). ---

export const weekdayOptions = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

/** Minutos seleccionables en los combos de hora: de 5 en 5. */
export const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5)

export interface Clock12 {
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
}

/**
 * Hora de un Date en formato de 12 horas.
 *
 * Antes se llamaba `to12Hour` en CalendarPage. QuickAddPage tenia otra funcion
 * con ese mismo nombre que recibia minutos: eran dos funciones distintas que
 * compartian nombre, no una duplicada. Ahora cada una tiene el suyo.
 */
export function clockFromDate(date: Date): Clock12 {
  const ampm = date.getHours() < 12 ? 'AM' : 'PM'
  const hour = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12
  return { hour, minute: date.getMinutes(), ampm }
}

/**
 * Inverso de `minutesOfDay`: minutos desde medianoche -> reloj de 12 horas.
 * Normaliza fuera del rango 0-1439 para tolerar sumas que se pasan del dia.
 */
export function clockFromMinutes(totalMinutes: number): Clock12 {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hour24 = Math.floor(normalized / 60)
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute: normalized % 60, ampm }
}

/** Reloj de 12 horas -> minutos desde medianoche. */
export function minutesOfDay(hour12: number, minute: number, ampm: 'AM' | 'PM'): number {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  return hour24 * 60 + minute
}

/** Proxima fecha (hoy incluido) que caiga en ese dia de semana ISO. */
export function nextDateForWeekday(weekday: number, from: Date = new Date()): Date {
  const offset = (weekday - isoWeekday(from) + 7) % 7
  return addDays(from, offset)
}

/** Combina una fecha con una hora de 12 horas, en hora local. */
export function buildDateTime(
  anchorDate: Date,
  hour12: number,
  minute: number,
  ampm: 'AM' | 'PM',
): Date {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  const result = new Date(anchorDate)
  result.setHours(hour24, minute, 0, 0)
  return result
}
