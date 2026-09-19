import {
  BookOpen,
  Dumbbell,
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
}

// Compartido entre "Add record" y "View records": mismo set de categorias en ambos lados.
export const recordTypes: RecordType[] = [
  { id: 'expense', label: 'Expense', icon: ReceiptText },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'meal', label: 'Meal', icon: Salad },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'study', label: 'Study session', icon: BookOpen },
  { id: 'note', label: 'Note', icon: NotebookPen },
]
