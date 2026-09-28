import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type { ExpenseFilterQuery } from '@/lib/expenseFilters'
import type {
  Expense,
  ExpenseCreatePayload,
  ExpenseGroupBy,
  ExpenseOptions,
  ExpensePage,
  ExpenseSummary,
} from '@/types/expense'

export function getExpenseOptions(): Promise<ExpenseOptions> {
  return getJson<ExpenseOptions>('/expenses/options')
}

export function createExpense(payload: ExpenseCreatePayload): Promise<Expense> {
  return postJson<Expense>('/expenses/', payload)
}

export function updateExpense(id: number, payload: ExpenseCreatePayload): Promise<Expense> {
  return putJson<Expense>(`/expenses/${id}`, payload)
}

/** Devuelve 404 si el registro no existe o no es del usuario. */
export function deleteExpense(id: number): Promise<void> {
  return deleteJson<void>(`/expenses/${id}`)
}

export interface ListExpensesParams extends ExpenseFilterQuery {
  page?: number
  pageSize?: number
}

function filterSearchParams(params: ExpenseFilterQuery): URLSearchParams {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  if (params.categoryId) query.set('category_id', String(params.categoryId))
  if (params.paymentMethodId) query.set('payment_method_id', String(params.paymentMethodId))
  for (const tagId of params.tagIds ?? []) query.append('tag_ids', String(tagId))
  if (params.minAmount != null) query.set('min_amount', String(params.minAmount))
  if (params.maxAmount != null) query.set('max_amount', String(params.maxAmount))
  return query
}

export function listExpenses(params: ListExpensesParams = {}): Promise<ExpensePage> {
  const query = filterSearchParams(params)
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 10))

  return getJson<ExpensePage>(`/expenses/?${query.toString()}`)
}

/** Mismos filtros que el listado, agregados por `groupBy` (para graficos). */
export function summarizeExpenses(
  groupBy: ExpenseGroupBy,
  params: ExpenseFilterQuery = {},
): Promise<ExpenseSummary> {
  const query = filterSearchParams(params)
  query.set('group_by', groupBy)
  return getJson<ExpenseSummary>(`/expenses/summary?${query.toString()}`)
}
