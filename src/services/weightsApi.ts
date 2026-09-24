import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type { Weight, WeightPage, WeightPayload } from '@/types/weight'

export interface ListWeightsParams {
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export function listWeights(params: ListWeightsParams = {}): Promise<WeightPage> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 10))

  return getJson<WeightPage>(`/weights/?${query.toString()}`)
}

export function createWeight(payload: WeightPayload): Promise<Weight> {
  return postJson<Weight>('/weights/', payload)
}

export function updateWeight(id: number, payload: WeightPayload): Promise<Weight> {
  return putJson<Weight>(`/weights/${id}`, payload)
}

/** Devuelve 404 si el registro no existe o no es del usuario. */
export function deleteWeight(id: number): Promise<void> {
  return deleteJson<void>(`/weights/${id}`)
}
