import { getJson, postJson } from '@/lib/http'
import type { Expense, ExpenseCreatePayload, ExpenseOptions, ExpensePage } from '@/types/expense'

export function getExpenseOptions(): Promise<ExpenseOptions> {
  return getJson<ExpenseOptions>('/expenses/options')
}

export function createExpense(payload: ExpenseCreatePayload): Promise<Expense> {
  return postJson<Expense>('/expenses/', payload)
}

export interface ListExpensesParams {
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export function listExpenses(params: ListExpensesParams = {}): Promise<ExpensePage> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  query.set('page', String(params.page ?? 1))
  query.set('page_size', String(params.pageSize ?? 10))

  return getJson<ExpensePage>(`/expenses/?${query.toString()}`)
}
