import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type { Meal, MealPage, MealPayload } from '@/types/meal'

export interface ListMealsParams {
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export function listMeals(params: ListMealsParams = {}): Promise<MealPage> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 10))

  return getJson<MealPage>(`/meals/?${query.toString()}`)
}

export function createMeal(payload: MealPayload): Promise<Meal> {
  return postJson<Meal>('/meals/', payload)
}

export function updateMeal(id: number, payload: MealPayload): Promise<Meal> {
  return putJson<Meal>(`/meals/${id}`, payload)
}

/** Devuelve 404 si el registro no existe o no es del usuario. */
export function deleteMeal(id: number): Promise<void> {
  return deleteJson<void>(`/meals/${id}`)
}
