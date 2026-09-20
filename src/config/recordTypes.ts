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

export interface RecordType {
  id: string
  label: string
  icon: Component
  // Si es false, "Add record" muestra el boton deshabilitado (sin form propio todavia).
  implemented: boolean
}

// Compartido entre "Add record" y "View records": mismo set de categorias en ambos lados.
export const recordTypes: RecordType[] = [
  { id: 'expense', label: 'Expense', icon: ReceiptText, implemented: false },
  { id: 'income', label: 'Income', icon: TrendingUp, implemented: false },
  { id: 'weight', label: 'Weight', icon: Scale, implemented: true },
  { id: 'meal', label: 'Meal', icon: Salad, implemented: false },
  { id: 'workout', label: 'Workout', icon: Dumbbell, implemented: false },
  { id: 'task', label: 'Task', icon: ListChecks, implemented: true },
  { id: 'note', label: 'Note', icon: NotebookPen, implemented: false },
]
