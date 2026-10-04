import { GraduationCap, ListChecks, Scale, TrendingUp } from '@lucide/vue'
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { anyPermissionOf, type Permission } from '@/config/permissions'

export interface AnalyticsType {
  id: string
  label: string
  icon: Component
  to?: RouteLocationRaw
  // Si es false, "Analytics" muestra el boton deshabilitado (grafico aun no armado).
  implemented: boolean
  permission?: Permission
}

export const analyticsTypes: AnalyticsType[] = [
  {
    id: 'checklists',
    label: 'Checklist trends',
    icon: ListChecks,
    to: { name: 'admin-analytics-checklists' },
    implemented: true,
    permission: 'planning',
  },
  {
    id: 'finance',
    label: 'Finance analysis',
    icon: TrendingUp,
    to: { name: 'admin-analytics-finance' },
    implemented: true,
    permission: 'finances',
  },
  {
    id: 'weight',
    label: 'Weight trend',
    icon: Scale,
    to: { name: 'admin-analytics-weight' },
    implemented: true,
    permission: 'weight',
  },
  { id: 'learning', label: 'Study hours', icon: GraduationCap, implemented: false },
]

// La pagina "Analytics" se muestra con cualquiera de estos.
export const ANALYTICS_PERMISSIONS = anyPermissionOf(analyticsTypes)
