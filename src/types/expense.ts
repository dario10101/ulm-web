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
