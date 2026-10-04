import {
  Dumbbell,
  ListChecks,
  NotebookPen,
  ReceiptText,
  Salad,
  Scale,
  TrendingUp,
} from '@lucide/vue'
import type { Component } from 'vue'

import { anyPermissionOf, type Permission } from '@/config/permissions'

export interface RecordType {
  id: string
  label: string
  icon: Component
  // Si es false, "Add record" muestra el boton deshabilitado (sin form propio todavia).
  implemented: boolean
  // Dominio al que pertenece. Los no implementados no piden ninguno: son un
  // boton deshabilitado igual para todos.
  permission?: Permission
}

// Compartido entre "Add record" y "View records": mismo set de categorias en ambos lados.
export const recordTypes: RecordType[] = [
  { id: 'expense', label: 'Expense', icon: ReceiptText, implemented: true, permission: 'finances' },
  { id: 'income', label: 'Income', icon: TrendingUp, implemented: true, permission: 'finances' },
  { id: 'weight', label: 'Weight', icon: Scale, implemented: true, permission: 'weight' },
  { id: 'meal', label: 'Meal', icon: Salad, implemented: true, permission: 'meals' },
  { id: 'workout', label: 'Workout', icon: Dumbbell, implemented: false },
  { id: 'task', label: 'Task', icon: ListChecks, implemented: true, permission: 'planning' },
  { id: 'note', label: 'Note', icon: NotebookPen, implemented: false },
]

// "Add record" / "View records" se muestran con cualquiera de estos.
export const RECORD_PERMISSIONS = anyPermissionOf(recordTypes)
