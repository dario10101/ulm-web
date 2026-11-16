import { getJson, postJson } from '@/lib/http'
import type { DashboardPulse, DashboardToday, PulseInterpretation } from '@/types/dashboard'

export function getDashboardToday(): Promise<DashboardToday> {
  return getJson<DashboardToday>('/dashboard/today')
}

/** Sin `weekStart`, la semana en curso. Acepta cualquier dia de la semana. */
export function getDashboardPulse(weekStart?: string): Promise<DashboardPulse> {
  return getJson<DashboardPulse>(`/dashboard/pulse${weekStart ? `?week_start=${weekStart}` : ''}`)
}

/** Una llamada al LLM con el pulso calculado en el servidor: gasta tokens. */
export function interpretDashboardPulse(weekStart?: string): Promise<PulseInterpretation> {
  return postJson<PulseInterpretation>('/dashboard/pulse/interpretation', {
    week_start: weekStart ?? null,
  })
}
