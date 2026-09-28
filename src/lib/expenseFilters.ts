/**
 * Estado de los filtros de gastos, compartido por "View records -> Expenses"
 * y "Finance analysis -> Expenses". Es un objeto plano e inmutable: el
 * componente ExpenseFilterBar emite uno nuevo en cada cambio, y cada pagina
 * lo traduce a parametros de API con expenseFilterQuery().
 */

// Dos modos de fecha excluyentes:
// - "ymd": cajas de año/mes/dia, todas opcionales y jerarquicas (sin año no
//   aplica mes, sin mes no aplica dia).
// - "range": from/to libres, ambos opcionales.
export type ExpenseDateMode = 'ymd' | 'range'

export interface ExpenseFilterState {
  dateMode: ExpenseDateMode
  year: number | null
  month: number | null
  day: number | null
  rangeStart: string
  rangeEnd: string
  categoryId: number | null
  paymentMethodId: number | null
  tagIds: number[]
  minAmount: string
  maxAmount: string
}

/** Parametros de filtro que entienden /expenses/ y /expenses/summary. */
export interface ExpenseFilterQuery {
  startDate?: string
  endDate?: string
  categoryId?: number
  paymentMethodId?: number
  tagIds?: number[]
  minAmount?: number
  maxAmount?: number
}

/** Por defecto: modo año/mes/dia con la fecha de hoy. `depth` permite a
 * otras vistas arrancar menos acotadas (ej. analisis: año completo). */
export function defaultExpenseFilters(
  today: Date = new Date(),
  depth: 'day' | 'month' | 'year' = 'day',
): ExpenseFilterState {
  return {
    dateMode: 'ymd',
    year: today.getFullYear(),
    month: depth === 'year' ? null : today.getMonth() + 1,
    day: depth === 'day' ? today.getDate() : null,
    rangeStart: '',
    rangeEnd: '',
    categoryId: null,
    paymentMethodId: null,
    tagIds: [],
    minAmount: '',
    maxAmount: '',
  }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Rango efectivo segun el modo de fecha activo. */
export function expenseDateRange(state: ExpenseFilterState): { start?: string; end?: string } {
  if (state.dateMode === 'range') {
    return { start: state.rangeStart || undefined, end: state.rangeEnd || undefined }
  }
  const { year, month, day } = state
  if (!year) return {}
  if (!month) return { start: `${year}-01-01`, end: `${year}-12-31` }
  if (!day) {
    return {
      start: `${year}-${pad(month)}-01`,
      end: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    }
  }
  const iso = `${year}-${pad(month)}-${pad(day)}`
  return { start: iso, end: iso }
}

export function expenseFilterQuery(state: ExpenseFilterState): ExpenseFilterQuery {
  const range = expenseDateRange(state)
  return {
    startDate: range.start,
    endDate: range.end,
    categoryId: state.categoryId ?? undefined,
    paymentMethodId: state.paymentMethodId ?? undefined,
    tagIds: state.tagIds.length ? state.tagIds : undefined,
    minAmount: state.minAmount ? Number(state.minAmount) : undefined,
    maxAmount: state.maxAmount ? Number(state.maxAmount) : undefined,
  }
}

/** Si hay algun filtro fuera de la fecha (para mostrar "Clear"). */
export function hasExtraExpenseFilters(state: ExpenseFilterState): boolean {
  return (
    state.categoryId !== null ||
    state.paymentMethodId !== null ||
    state.tagIds.length > 0 ||
    state.minAmount !== '' ||
    state.maxAmount !== ''
  )
}

/** Aplica un cambio respetando la jerarquia año > mes > dia. */
export function patchExpenseFilters(
  state: ExpenseFilterState,
  patch: Partial<ExpenseFilterState>,
): ExpenseFilterState {
  const next = { ...state, ...patch }
  if (!next.year) {
    next.month = null
    next.day = null
  }
  if (!next.month) next.day = null
  if (next.year && next.month && next.day && next.day > daysInMonth(next.year, next.month)) {
    next.day = null
  }
  return next
}
