import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Search,
  Settings,
} from '@lucide/vue'

import type { NavItem } from '@/types/nav'

// Seccion principal del sidebar (fija, arriba).
export const mainNavItems: NavItem[] = [
  { label: 'Dashboard', to: { name: 'admin-dashboard' }, icon: LayoutDashboard },
  { label: 'Add record', to: { name: 'admin-quick-add' }, icon: PlusCircle },
  { label: 'View records', to: { name: 'admin-records' }, icon: Search },
  { label: "Today's checklist", to: { name: 'admin-checklists' }, icon: ListChecks },
  { label: 'Calendar', to: { name: 'admin-calendar' }, icon: CalendarDays },
  { label: 'Study & review', to: { name: 'admin-learning' }, icon: GraduationCap },
  { label: 'Analytics', to: { name: 'admin-analytics' }, icon: BarChart3 },
]

// Seccion de configuracion del sidebar (fija, abajo).
export const bottomNavItems: NavItem[] = [
  { label: 'Settings', to: { name: 'admin-settings' }, icon: Settings },
  { label: 'Help', to: { name: 'admin-help' }, icon: HelpCircle },
]
