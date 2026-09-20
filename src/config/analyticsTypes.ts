import { GraduationCap, ListChecks, Scale, TrendingUp } from '@lucide/vue'
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface AnalyticsType {
  id: string
  label: string
  icon: Component
  to?: RouteLocationRaw
  // Si es false, "Analytics" muestra el boton deshabilitado (grafico aun no armado).
  implemented: boolean
}

export const analyticsTypes: AnalyticsType[] = [
  {
    id: 'checklists',
    label: 'Checklist trends',
    icon: ListChecks,
    to: { name: 'admin-analytics-checklists' },
    implemented: true,
  },
  { id: 'finance', label: 'Finance analysis', icon: TrendingUp, implemented: false },
  { id: 'weight', label: 'Weight trend', icon: Scale, implemented: false },
  { id: 'learning', label: 'Study hours', icon: GraduationCap, implemented: false },
]
