/**
 * Estado de los filtros de "View records -> Income". Misma idea que
 * expenseFilters.ts (objeto plano inmutable, la barra emite uno nuevo en cada
 * cambio) y reutiliza su logica de fechas (modo Y/M/D o rango).
 */
import { expenseDateRange, type DateFilterFields } from '@/lib/expenseFilters'

export interface IncomeFilterState extends DateFilterFields {
  sourceId: number | null
  subcategoryId: number | null
  tagIds: number[]
  minAmount: string
  maxAmount: string
}

/** Parametros que entienden /incomes/direct y /incomes/interest. */
export interface IncomeFilterQuery {
  startDate?: string
  endDate?: string
  sourceId?: number
  subcategoryId?: number
  tagIds?: number[]
  minAmount?: number
  maxAmount?: number
}

/**
 * Por defecto el anio en curso, no el dia de hoy como en gastos: los
 * ingresos son pocos por mes (una quincena, un interes mensual) y filtrar por
 * dia casi siempre mostraria la lista vacia.
 */
export function defaultIncomeFilters(today: Date = new Date()): IncomeFilterState {
  return {
    dateMode: 'ymd',
    year: today.getFullYear(),
    month: null,
    day: null,
    rangeStart: '',
    rangeEnd: '',
    sourceId: null,
    subcategoryId: null,
    tagIds: [],
    minAmount: '',
    maxAmount: '',
  }
}

function amountOrUndefined(text: string): number | undefined {
  if (text.trim() === '') return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

export function incomeFilterQuery(state: IncomeFilterState): IncomeFilterQuery {
  const range = expenseDateRange(state)
  return {
    startDate: range.start,
    endDate: range.end,
    sourceId: state.sourceId ?? undefined,
    subcategoryId: state.subcategoryId ?? undefined,
    tagIds: state.tagIds.length ? state.tagIds : undefined,
    minAmount: amountOrUndefined(state.minAmount),
    maxAmount: amountOrUndefined(state.maxAmount),
  }
}

export function hasExtraIncomeFilters(state: IncomeFilterState): boolean {
  return (
    state.sourceId !== null ||
    state.subcategoryId !== null ||
    state.tagIds.length > 0 ||
    state.minAmount !== '' ||
    state.maxAmount !== ''
  )
}
