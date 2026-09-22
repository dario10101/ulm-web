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

import { formatIsoDate } from '@/lib/date'

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
