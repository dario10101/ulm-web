export type CategoryStatus = 'ENABLED' | 'DISABLED'

export interface Category {
  id: number
  name: string
  priority: number
  status: CategoryStatus
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
  detail: string | null
}

export interface TemplateTaskPayload {
  name: string
  importance: Importance
  category_id: number
  days: number[]
  detail?: string | null
}

export interface TemplateTaskDayUpdate {
  name: string
  importance: Importance
  category_id: number
  detail?: string | null
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

export interface WeekRange {
  min_first_day: string
  min_last_day: string
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
  detail: string | null
}

export interface TaskCreatePayload {
  name: string
  importance: Importance
  category_id: number
  day_of_week: number
  detail?: string | null
}

export interface TaskUpdatePayload {
  name: string
  importance: Importance
  category_id: number
  detail?: string | null
}

// --- Analytics (tendencias de semanas cerradas) ---

export interface AnalyticsCategory {
  // null es el bucket "Others" (categorias de menor puntaje agrupadas por el backend).
  category_id: number | null
  name: string
}

export interface WeeklyAnalyticsPoint {
  week_id: number
  first_day: string
  last_day: string
  total_score: number
  // Alineado 1:1 con WeeklyAnalyticsRead.categories.
  scores: number[]
}

export interface WeeklyAnalyticsRead {
  year: number
  categories: AnalyticsCategory[]
  weeks: WeeklyAnalyticsPoint[]
}

export interface MonthlyAnalyticsPoint {
  month: number
  total_score: number
  // Alineado 1:1 con MonthlyAnalyticsRead.categories.
  scores: number[]
}

export interface MonthlyAnalyticsRead {
  year: number
  categories: AnalyticsCategory[]
  months: MonthlyAnalyticsPoint[]
}
