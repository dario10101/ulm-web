// Debe calzar con app/schemas/finance.py (backend).

export interface CategoryOption {
  id: number
  name: string
  icon_key: string
  color_key: string
  status: 'ENABLED' | 'DISABLED'
}

export interface PaymentMethodOption {
  id: number
  name: string
  icon_key: string
  color_key: string
  status: 'ENABLED' | 'DISABLED'
}

export interface ExpenseTagOption {
  id: number
  name: string
  color_key: string
  status: 'ENABLED' | 'DISABLED'
}

export interface ExpenseOptions {
  categories: CategoryOption[]
  payment_methods: PaymentMethodOption[]
  tags: ExpenseTagOption[]
}

export interface Expense {
  id: number
  user_id: number
  name: string
  amount: number
  recorded_on: string
  note: string | null
  category: CategoryOption
  payment_method: PaymentMethodOption
  tags: ExpenseTagOption[]
  created_at: string
  updated_at: string | null
}

export interface ExpensePage {
  items: Expense[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ExpenseCreatePayload {
  name: string
  amount: number
  recorded_on: string
  note?: string | null
  payment_method_id: number
  category_id: number
  tag_ids?: number[]
}

export type ExpenseGroupBy = 'category' | 'tag' | 'payment_method' | 'month' | 'year'

export interface ExpenseSummarySegment {
  key: string
  label: string
  icon_key: string | null
  color_key: string | null
  total: number
}

export interface ExpenseSummaryBucket {
  /** id del catalogo ("none" = sin tag) o periodo ("2026-09" / "2026"). */
  key: string
  label: string
  icon_key: string | null
  color_key: string | null
  total: number
  count: number
  /** Solo en month/year: desglose del periodo por categoria (mayor a menor). */
  segments: ExpenseSummarySegment[]
}

export interface ExpenseSummary {
  group_by: ExpenseGroupBy
  /** Total del conjunto filtrado. Por tag, la suma de buckets puede superarlo. */
  total: number
  count: number
  buckets: ExpenseSummaryBucket[]
}
