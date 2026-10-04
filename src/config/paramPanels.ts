import {
  CalendarDays,
  CreditCard,
  KeyRound,
  Landmark,
  ListTree,
  Palette,
  Shapes,
  Tags,
  UserRound,
} from '@lucide/vue'
import type { Component } from 'vue'

/**
 * Paneles de parametros. Cada uno tiene su URL:
 * - Settings: /admin/settings/<section> (los de "System" son solo del admin).
 * - Del dominio, desde "View records": /admin/records/<type>/<panel>.
 */

export interface SettingsSection {
  id: string
  label: string
  icon: Component
  group: 'Account' | 'System'
  adminOnly: boolean
}

export const settingsSections: SettingsSection[] = [
  { id: 'general', label: 'General', icon: UserRound, group: 'Account', adminOnly: false },
  { id: 'appearance', label: 'Appearance', icon: Palette, group: 'Account', adminOnly: false },
  {
    id: 'expense-categories',
    label: 'Expense categories',
    icon: Shapes,
    group: 'System',
    adminOnly: true,
  },
  {
    id: 'payment-methods',
    label: 'Payment methods',
    icon: CreditCard,
    group: 'System',
    adminOnly: true,
  },
  {
    id: 'calendar-events',
    label: 'Holidays & dates',
    icon: CalendarDays,
    group: 'System',
    adminOnly: true,
  },
  { id: 'access', label: 'Access', icon: KeyRound, group: 'System', adminOnly: true },
]

export const DEFAULT_SETTINGS_SECTION = 'general'

export interface RecordParamPanel {
  id: string
  label: string
  icon: Component
}

const TAGS: RecordParamPanel = { id: 'tags', label: 'Tags', icon: Tags }

/** Paneles por tipo de registro (id de config/recordTypes.ts). Los tags son
 * los mismos en gastos e ingresos: el panel es uno, accesible desde ambos. */
export const recordParamPanels: Record<string, RecordParamPanel[]> = {
  expense: [TAGS],
  income: [
    TAGS,
    { id: 'sources', label: 'Sources', icon: Landmark },
    { id: 'subcategories', label: 'Subcategories', icon: ListTree },
  ],
}
