import { deleteJson, getJson, patchJson, postJson, putJson } from '@/lib/http'
import type {
  Category,
  CategoryWrite,
  MonthlyAnalyticsRead,
  Task,
  TaskCreatePayload,
  TaskStatus,
  TaskUpdatePayload,
  TemplateTask,
  TemplateTaskDayUpdate,
  TemplateTaskPayload,
  Week,
  WeeklyAnalyticsRead,
  WeekPayload,
  WeekRange,
} from '@/types/checklist'

export function listCategories(includeDisabled = false): Promise<Category[]> {
  return getJson<Category[]>(
    `/checklists/categories${includeDisabled ? '?include_disabled=true' : ''}`,
  )
}

export function replaceCategories(items: CategoryWrite[]): Promise<Category[]> {
  return putJson<Category[]>('/checklists/categories', { items })
}

export function enableCategory(categoryId: number): Promise<Category> {
  return postJson<Category>(`/checklists/categories/${categoryId}/enable`, {})
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

export function getNextWeekRange(): Promise<WeekRange> {
  return getJson<WeekRange>('/checklists/weeks/next-range')
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

export function createWeekTask(weekId: number, payload: TaskCreatePayload): Promise<Task> {
  return postJson<Task>(`/checklists/weeks/${weekId}/tasks`, payload)
}

export function updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
  return patchJson<Task>(`/checklists/tasks/${taskId}`, { status })
}

export function updateTask(taskId: number, payload: TaskUpdatePayload): Promise<Task> {
  return putJson<Task>(`/checklists/tasks/${taskId}`, payload)
}

export function deleteTask(taskId: number): Promise<void> {
  return deleteJson<void>(`/checklists/tasks/${taskId}`)
}

export function getWeeklyAnalytics(year: number): Promise<WeeklyAnalyticsRead> {
  return getJson<WeeklyAnalyticsRead>(`/checklists/analytics/weekly?year=${year}`)
}

export function getMonthlyAnalytics(year: number): Promise<MonthlyAnalyticsRead> {
  return getJson<MonthlyAnalyticsRead>(`/checklists/analytics/monthly?year=${year}`)
}
