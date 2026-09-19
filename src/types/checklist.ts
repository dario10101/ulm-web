export interface Category {
  id: number
  name: string
  priority: number
}

export interface CategoryWrite {
  id?: number | null
  name: string
}

export type Importance = 'HIGH' | 'STANDARD'

export interface TemplateTask {
  id: number
  name: string
  importance: Importance
  points: number
  category_id: number
  days: number[]
}

export interface TemplateTaskPayload {
  name: string
  importance: Importance
  category_id: number
  days: number[]
}

export interface TemplateTaskDayUpdate {
  name: string
  importance: Importance
  category_id: number
}

export type TaskStatus = 'PENDING' | 'COMPLETE' | 'FAILED'

export interface Week {
  id: number
  first_day: string
  last_day: string
  closed: boolean
  closed_date: string | null
  score: number | null
}

export interface WeekPayload {
  first_day: string
  last_day: string
}

export interface Task {
  id: number
  name: string
  importance: Importance
  points: number
  category_id: number
  day_of_week: number
  status: TaskStatus
  last_modified_date: string
}
