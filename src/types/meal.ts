// Debe calzar exactamente con el enum `MealType` de app/schemas/meal.py (backend).
export type MealType =
  | 'BREAKFAST'
  | 'MID_MORNING_SNACK'
  | 'LUNCH'
  | 'MID_AFTERNOON_SNACK'
  | 'DINNER'
  | 'LATE_NIGHT_SNACK'

export interface MealComponentPayload {
  name: string
  percent: number
}

export interface Meal {
  id: number
  user_id: number
  recorded_on: string
  meal_type: MealType
  meal_size: number
  meal_content: string | null
  drink: string | null
  note: string | null
  created_at: string
  updated_at: string | null
}

export interface MealPage {
  items: Meal[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MealPayload {
  recorded_on: string
  meal_type: MealType
  meal_size: number
  components: MealComponentPayload[]
  drink?: string | null
  note?: string | null
}
