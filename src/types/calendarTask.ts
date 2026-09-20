import type { Importance } from './checklist'

export type RepeatMode = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface CalendarTask {
  id: number
  name: string
  importance: Importance
  category_id: number
  notify: boolean
  repeat_mode: RepeatMode | null
  scheduled_date: string | null
  repeat_date: string | null
  // Minutos desde la hora de inicio hasta la hora final. Nunca cruza la
  // medianoche del dia de inicio (se valida en el backend).
  duration_minutes: number
  add_to_checklist: boolean
  detail: string | null
  last_modified_date: string
}

export interface CalendarTaskCreatePayload {
  name: string
  importance: Importance
  category_id: number
  notify: boolean
  repeat_mode?: RepeatMode | null
  scheduled_date?: string | null
  repeat_date?: string | null
  duration_minutes: number
  add_to_checklist: boolean
  detail?: string | null
}

// Edicion: no incluye repeat_mode ni add_to_checklist, no son editables.
export interface CalendarTaskUpdatePayload {
  name: string
  importance: Importance
  category_id: number
  notify: boolean
  scheduled_date?: string | null
  repeat_date?: string | null
  duration_minutes: number
  detail?: string | null
}

// Una ocurrencia concreta de una tarea en un dia puntual (vista diaria).
export interface CalendarTaskOccurrence {
  id: number
  name: string
  importance: Importance
  category_id: number
  notify: boolean
  repeat_mode: RepeatMode | null
  // Ancla cruda de la serie (para prellenar el formulario de edicion): no usar
  // para ubicar la tarea en la grilla, para eso esta occurrence_at.
  scheduled_date: string | null
  repeat_date: string | null
  duration_minutes: number
  add_to_checklist: boolean
  detail: string | null
  occurrence_at: string
}

export interface ChecklistSyncResult {
  task: CalendarTask
  added_to_current_week: boolean
}
