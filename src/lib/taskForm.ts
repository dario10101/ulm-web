/**
 * Validacion compartida del formulario de tarea de calendario.
 *
 * El alta y la edicion tienen campos distintos (solo el alta puede elegir
 * repeticion y sincronizar con el checklist), pero validan exactamente lo
 * mismo y arman la fecha de la misma forma. Eso es lo que vive aca.
 *
 * Logica pura: entra el estado del formulario, sale un error o los valores
 * listos para mandar a la API.
 */

import { parseIsoDate } from '@/lib/date'
import { buildDateTime, formatLocalDateTime, minutesOfDay, nextDateForWeekday } from '@/lib/time'

export interface TaskFormFields {
  name: string
  categoryId: number | null
  date: string
  weekday: number
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
  endHour: number
  endMinute: number
  endAmpm: 'AM' | 'PM'
}

export type TaskFormValidation =
  | { ok: false; error: string }
  | {
      ok: true
      name: string
      categoryId: number
      /** Hora de pared local, lista para mandar a la API (ver lib/time.ts). */
      localDateTime: string
      durationMinutes: number
    }

/**
 * @param isWeekly si la tarea repite semanalmente, en cuyo caso el ancla es el
 *   proximo dia de semana elegido y el campo de fecha no aplica
 */
export function validateTaskForm(form: TaskFormFields, isWeekly: boolean): TaskFormValidation {
  const name = form.name.trim()

  if (!name || !form.categoryId) {
    return { ok: false, error: 'Name and category are required.' }
  }
  if (!isWeekly && !form.date) {
    return { ok: false, error: 'Date is required.' }
  }

  const startMinutes = minutesOfDay(form.hour, form.minute, form.ampm)
  const endMinutes = minutesOfDay(form.endHour, form.endMinute, form.endAmpm)
  if (endMinutes <= startMinutes) {
    return { ok: false, error: 'End time must be after start time, on the same day.' }
  }

  const anchorDate = isWeekly ? nextDateForWeekday(form.weekday) : parseIsoDate(form.date)

  return {
    ok: true,
    name,
    categoryId: form.categoryId,
    localDateTime: formatLocalDateTime(
      buildDateTime(anchorDate, form.hour, form.minute, form.ampm),
    ),
    durationMinutes: endMinutes - startMinutes,
  }
}

/** Hora final por defecto: una hora despues del inicio, sin cruzar medianoche. */
export function defaultEndMinutes(startMinutes: number): number {
  return Math.min(startMinutes + 60, 23 * 60 + 59)
}
