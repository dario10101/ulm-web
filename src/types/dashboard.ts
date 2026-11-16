import type { CalendarEventRange } from './calendarEvent'

// Dashboard ("Quick access"), tal como lo devuelve ulm-core
// (app/schemas/dashboard.py). Una seccion de dominio en null = el usuario no
// tiene ese permiso; "sin datos" llega como seccion con valores null o 0.

export interface DashboardToday {
  date: string
  // Festivos y fechas especiales (para todos) + eventos personales (planning).
  events: CalendarEventRange[]
  weight: { last_recorded_on: string | null; last_kg: number | null } | null
  english: { last_practice_at: string | null } | null
}

export interface PulseWeek {
  first_day: string
  last_day: string
  in_progress: boolean
  elapsed_days: number
  total_days: number
}

/** Semana pedida, la anterior y promedio de las 4 anteriores. null = sin datos. */
export interface PulseComparison {
  current: number | null
  previous: number | null
  average: number | null
}

export interface PulseFinances {
  spent: PulseComparison
  top_deviation: { label: string; current: number; average: number } | null
  month_first_day: string
  month_last_day: string
  month_income: number
  month_expenses: number
  savings_rate_pct: number | null
}

export interface DashboardPulse {
  week: PulseWeek
  planning: { score_pct: PulseComparison } | null
  finances: PulseFinances | null
  weight: { average_kg: PulseComparison } | null
  english: { sessions: PulseComparison } | null
}

export interface PulseInterpretation {
  text: string
  model: string
}
