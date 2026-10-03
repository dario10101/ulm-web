// Debe calzar con app/schemas/finance.py (backend).
import type { ExpenseTagOption } from '@/types/expense'

export type IncomeKind = 'direct' | 'interest'

/** A que tipo aplica una fuente/subcategoria; ALL = ambos. */
export type IncomeCatalogType = 'DIRECT' | 'INTEREST' | 'ALL'

export interface IncomeSourceOption {
  id: number
  name: string
  type: IncomeCatalogType
}

/** Pertenece a una sola fuente (`source_id`). */
export interface IncomeSubcategoryOption {
  id: number
  source_id: number
  name: string
  type: IncomeCatalogType
}

export interface InterestEndBalance {
  source_id: number
  /** "YYYY-MM" */
  period: string
  end_of_month_amount: number
}

export interface IncomeOptions {
  sources: IncomeSourceOption[]
  subcategories: IncomeSubcategoryOption[]
  tags: ExpenseTagOption[]
  interest_end_balances: InterestEndBalance[]
}

interface IncomeRecordBase {
  id: number
  user_id: number
  amount: number
  recorded_on: string
  note: string | null
  source: IncomeSourceOption
  subcategory: IncomeSubcategoryOption
  tags: ExpenseTagOption[]
  created_at: string
  updated_at: string | null
}

export type DirectIncome = IncomeRecordBase

export interface InterestIncome extends IncomeRecordBase {
  start_of_month_amount: number | null
  end_of_month_amount: number | null
  deposits_amount: number
  withdrawals_amount: number
}

export interface IncomePage<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DirectIncomePayload {
  amount: number
  recorded_on: string
  note: string | null
  source_id: number
  subcategory_id: number
  tag_ids: number[]
}

export interface InterestIncomePayload extends DirectIncomePayload {
  start_of_month_amount: number | null
  end_of_month_amount: number | null
  deposits_amount: number
  withdrawals_amount: number
}

// --- Analisis (GET /incomes/summary) ---

export type IncomeGroupBy = 'source' | 'subcategory' | 'tag' | 'month' | 'year'
export type IncomeStackBy = 'source' | 'subcategory'

export interface IncomeSummarySegment {
  key: string
  label: string
  total: number
}

export interface IncomeSummaryBucket {
  /** id del catalogo ("none" = sin tag) o periodo ("2026-09" / "2026"). */
  key: string
  label: string
  /** Fuente de una subcategoria (hay nombres repetidos entre fuentes). */
  parent_label: string | null
  color_key: string | null
  total: number
  count: number
  /** Solo en mes/año con stack_by: desglose del periodo. */
  segments: IncomeSummarySegment[]
}

export interface IncomeSummary {
  group_by: IncomeGroupBy
  stack_by: IncomeStackBy | null
  /** Total del conjunto filtrado. Por tag, la suma de buckets puede superarlo. */
  total: number
  count: number
  direct_total: number
  interest_total: number
  buckets: IncomeSummaryBucket[]
}
