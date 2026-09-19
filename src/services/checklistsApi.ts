import { deleteJson, getJson, patchJson, postJson, putJson } from '@/lib/http'
import type {
  Category,
  CategoryWrite,
  Task,
  TaskStatus,
  TemplateTask,
  TemplateTaskDayUpdate,
  TemplateTaskPayload,
  Week,
  WeekPayload,
} from '@/types/checklist'

export function listCategories(): Promise<Category[]> {
  return getJson<Category[]>('/checklists/categories')
}

export function replaceCategories(items: CategoryWrite[]): Promise<Category[]> {
  return putJson<Category[]>('/checklists/categories', { items })
}

export function listTemplateTasks(): Promise<TemplateTask[]> {
  return getJson<TemplateTask[]>('/checklists/template/tasks')
}

export function createTemplateTask(payload: TemplateTaskPayload): Promise<TemplateTask> {
  return postJson<TemplateTask>('/checklists/template/tasks', payload)
}

export function updateTemplateTaskForDay(
  taskId: number,
  day: number,
  payload: TemplateTaskDayUpdate,
): Promise<TemplateTask> {
  return putJson<TemplateTask>(`/checklists/template/tasks/${taskId}?day=${day}`, payload)
}

export function deleteTemplateTaskForDay(taskId: number, day: number): Promise<void> {
  return deleteJson<void>(`/checklists/template/tasks/${taskId}?day=${day}`)
}

export function getCurrentWeek(): Promise<Week | null> {
  return getJson<Week | null>('/checklists/weeks/current')
}

export function createWeek(payload: WeekPayload): Promise<Week> {
  return postJson<Week>('/checklists/weeks', payload)
}

export function closeWeek(weekId: number): Promise<Week> {
  return postJson<Week>(`/checklists/weeks/${weekId}/close`, {})
}

export function listWeekTasks(weekId: number): Promise<Task[]> {
  return getJson<Task[]>(`/checklists/weeks/${weekId}/tasks`)
}

export function updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
  return patchJson<Task>(`/checklists/tasks/${taskId}`, { status })
}
