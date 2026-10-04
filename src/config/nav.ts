import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  PlusCircle,
  Search,
  Settings,
} from '@lucide/vue'

import { ANALYTICS_PERMISSIONS } from '@/config/analyticsTypes'
import { RECORD_PERMISSIONS } from '@/config/recordTypes'
import type { NavItem } from '@/types/nav'

// Seccion principal del sidebar (fija, arriba).
export const mainNavItems: NavItem[] = [
  { label: 'Dashboard', to: { name: 'admin-dashboard' }, icon: LayoutDashboard },
  {
    label: 'Add record',
    to: { name: 'admin-quick-add' },
    icon: PlusCircle,
    permission: RECORD_PERMISSIONS,
  },
  {
    label: 'View records',
    to: { name: 'admin-records' },
    icon: Search,
    permission: RECORD_PERMISSIONS,
  },
  {
    label: "Today's checklist",
    to: { name: 'admin-checklists' },
    icon: ListChecks,
    permission: 'planning',
  },
  {
    label: 'Calendar',
    to: { name: 'admin-calendar' },
    icon: CalendarDays,
    permission: 'planning',
  },
  { label: 'Study & review', to: { name: 'admin-learning' }, icon: GraduationCap },
  {
    label: 'Analytics',
    to: { name: 'admin-analytics' },
    icon: BarChart3,
    permission: ANALYTICS_PERMISSIONS,
  },
  { label: 'Blog', to: { name: 'admin-blog' }, icon: Newspaper, permission: 'blog' },
]

// Seccion de configuracion del sidebar (fija, abajo).
export const bottomNavItems: NavItem[] = [
  { label: 'Settings', to: { name: 'admin-settings' }, icon: Settings },
  { label: 'Help', to: { name: 'admin-help' }, icon: HelpCircle },
]
