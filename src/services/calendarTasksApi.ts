import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type {
  CalendarTask,
  CalendarTaskCreatePayload,
  CalendarTaskOccurrence,
  CalendarTaskUpdatePayload,
  ChecklistSyncResult,
} from '@/types/calendarTask'

export function createCalendarTask(payload: CalendarTaskCreatePayload): Promise<CalendarTask> {
  return postJson<CalendarTask>('/calendar-tasks', payload)
}

export function listCalendarTasksForDay(date: string): Promise<CalendarTaskOccurrence[]> {
  return getJson<CalendarTaskOccurrence[]>(`/calendar-tasks?date=${date}`)
}

export function listCalendarTasksForRange(
  firstDay: string,
  lastDay: string,
): Promise<CalendarTaskOccurrence[]> {
  return getJson<CalendarTaskOccurrence[]>(`/calendar-tasks?first_day=${firstDay}&last_day=${lastDay}`)
}

export function updateCalendarTask(
  id: number,
  payload: CalendarTaskUpdatePayload,
): Promise<CalendarTask> {
  return putJson<CalendarTask>(`/calendar-tasks/${id}`, payload)
}

export function deleteCalendarTask(id: number, occurrenceDate?: string): Promise<void> {
  const query = occurrenceDate ? `?occurrence_date=${occurrenceDate}` : ''
  return deleteJson<void>(`/calendar-tasks/${id}${query}`)
}

export function enableCalendarTaskChecklistSync(
  id: number,
  occurrenceDate: string,
): Promise<ChecklistSyncResult> {
  return postJson<ChecklistSyncResult>(
    `/calendar-tasks/${id}/checklist?occurrence_date=${occurrenceDate}`,
    {},
  )
}
