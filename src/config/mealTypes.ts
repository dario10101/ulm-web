import type { MealType } from '@/types/meal'

// Compartido entre el form de alta (QuickAddPage), el de edicion
// (MealFormDialog) y el listado (RecordsPage), para no repetir las mismas 6
// opciones/labels en tres lugares.
export const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'MID_MORNING_SNACK', label: 'Mid-morning snack' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'MID_AFTERNOON_SNACK', label: 'Mid-afternoon snack' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'LATE_NIGHT_SNACK', label: 'Late night snack' },
]

export function mealTypeLabel(value: MealType): string {
  return mealTypeOptions.find((opt) => opt.value === value)?.label ?? value
}

// Franjas horarias para sugerir el tipo de comida segun la hora actual.
export function defaultMealTypeForHour(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'BREAKFAST'
  if (hour >= 10 && hour < 12) return 'MID_MORNING_SNACK'
  if (hour >= 12 && hour < 15) return 'LUNCH'
  if (hour >= 15 && hour < 19) return 'MID_AFTERNOON_SNACK'
  if (hour >= 19 && hour < 22) return 'DINNER'
  return 'LATE_NIGHT_SNACK'
}
