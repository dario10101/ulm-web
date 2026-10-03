import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type { IncomeFilterQuery } from '@/lib/incomeFilters'
import type {
  DirectIncome,
  DirectIncomePayload,
  IncomeGroupBy,
  IncomeKind,
  IncomeOptions,
  IncomeStackBy,
  IncomeSummary,
  IncomePage,
  InterestIncome,
  InterestIncomePayload,
} from '@/types/income'

/** Fuentes, subcategorias, tags y saldos finales de intereses, en un solo request. */
export function getIncomeOptions(): Promise<IncomeOptions> {
  return getJson<IncomeOptions>('/incomes/options')
}

export function createDirectIncome(payload: DirectIncomePayload): Promise<DirectIncome> {
  return postJson<DirectIncome>('/incomes/direct', payload)
}

export function updateDirectIncome(
  id: number,
  payload: DirectIncomePayload,
): Promise<DirectIncome> {
  return putJson<DirectIncome>(`/incomes/direct/${id}`, payload)
}

/** 409 si ya hay un registro para esa fuente en ese mes. */
export function createInterestIncome(payload: InterestIncomePayload): Promise<InterestIncome> {
  return postJson<InterestIncome>('/incomes/interest', payload)
}

export function updateInterestIncome(
  id: number,
  payload: InterestIncomePayload,
): Promise<InterestIncome> {
  return putJson<InterestIncome>(`/incomes/interest/${id}`, payload)
}

export function deleteIncome(kind: IncomeKind, id: number): Promise<void> {
  return deleteJson<void>(`/incomes/${kind}/${id}`)
}

export interface ListIncomesParams extends IncomeFilterQuery {
  page?: number
  pageSize?: number
}

export function listIncomes(
  kind: 'direct',
  params?: ListIncomesParams,
): Promise<IncomePage<DirectIncome>>
export function listIncomes(
  kind: 'interest',
  params?: ListIncomesParams,
): Promise<IncomePage<InterestIncome>>
export function listIncomes(
  kind: IncomeKind,
  params: ListIncomesParams = {},
): Promise<IncomePage<DirectIncome | InterestIncome>> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  if (params.sourceId) query.set('source_id', String(params.sourceId))
  if (params.subcategoryId) query.set('subcategory_id', String(params.subcategoryId))
  for (const tagId of params.tagIds ?? []) query.append('tag_ids', String(tagId))
  if (params.minAmount != null) query.set('min_amount', String(params.minAmount))
  if (params.maxAmount != null) query.set('max_amount', String(params.maxAmount))
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 10))
  return getJson(`/incomes/${kind}?${query.toString()}`)
}

export interface IncomeSummaryParams {
  stackBy?: IncomeStackBy
  kind?: IncomeKind
  startDate?: string
  endDate?: string
  sourceIds?: number[]
  subcategoryIds?: number[]
  tagIds?: number[]
}

/** Directos + intereses agregados por `groupBy` (para "Finance analysis -> Income"). */
export function summarizeIncomes(
  groupBy: IncomeGroupBy,
  params: IncomeSummaryParams = {},
): Promise<IncomeSummary> {
  const query = new URLSearchParams({ group_by: groupBy })
  if (params.stackBy) query.set('stack_by', params.stackBy)
  if (params.kind) query.set('kind', params.kind)
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  for (const id of params.sourceIds ?? []) query.append('source_ids', String(id))
  for (const id of params.subcategoryIds ?? []) query.append('subcategory_ids', String(id))
  for (const id of params.tagIds ?? []) query.append('tag_ids', String(id))
  return getJson<IncomeSummary>(`/incomes/summary?${query.toString()}`)
}
