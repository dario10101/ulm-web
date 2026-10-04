/**
 * Filtros de "Finance analysis -> Income vs expenses". Mas simples que los de
 * cada area (no hay rango ni dia): cada vista usa solo una parte.
 * - month: año obligatorio (default el actual) + tags.
 * - year: solo tags (compara todos los años).
 * - tags: año y mes opcionales + un unico tag obligatorio (el pastel compara
 *   ingresos y gastos de ese tag).
 */
import { daysInMonth } from '@/lib/expenseFilters'

export type IncomeVsExpensesView = 'month' | 'year' | 'tags'

export interface IncomeVsExpensesFilters {
  year: number | null
  /** 1-12. Solo con año. */
  month: number | null
  /** Multi-seleccion de las vistas mensual/anual. */
  tagIds: number[]
  /** Tag unico de la vista por tags. Campo aparte para no pisar `tagIds` al alternar vistas. */
  tagId: number | null
}

/** Lo que entienden /incomes/summary y /expenses/summary por igual. */
export interface IncomeVsExpensesQuery {
  startDate?: string
  endDate?: string
  tagIds?: number[]
}

export function defaultIncomeVsExpensesFilters(today: Date = new Date()): IncomeVsExpensesFilters {
  return { year: today.getFullYear(), month: null, tagIds: [], tagId: null }
}

/** Sin año no hay mes (misma jerarquia que los filtros de gastos). */
export function patchIncomeVsExpensesFilters(
  state: IncomeVsExpensesFilters,
  patch: Partial<IncomeVsExpensesFilters>,
): IncomeVsExpensesFilters {
  const next = { ...state, ...patch }
  if (!next.year) next.month = null
  return next
}

/**
 * Ajuste al entrar a una vista: en la mensual el año es obligatorio; en la de
 * tags debe haber un tag (si no hay, `fallbackTagId`: el primero disponible).
 */
export function filtersForView(
  state: IncomeVsExpensesFilters,
  view: IncomeVsExpensesView,
  fallbackTagId: number | null = null,
  today: Date = new Date(),
): IncomeVsExpensesFilters {
  if (view === 'tags' && state.tagId === null && fallbackTagId !== null) {
    return { ...state, tagId: fallbackTagId }
  }
  if (view === 'month') {
    return patchIncomeVsExpensesFilters(state, {
      year: state.year ?? today.getFullYear(),
      month: null,
    })
  }
  return state
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Traduce solo los filtros que aplican a la vista (los demas se ignoran, no se borran). */
export function incomeVsExpensesQuery(
  state: IncomeVsExpensesFilters,
  view: IncomeVsExpensesView,
): IncomeVsExpensesQuery {
  const tagIds =
    view === 'tags'
      ? state.tagId === null
        ? undefined
        : [state.tagId]
      : state.tagIds.length
        ? state.tagIds
        : undefined
  if (view === 'year' || !state.year) return { tagIds }
  const { year, month } = state
  if (view === 'month' || !month) {
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, tagIds }
  }
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    tagIds,
  }
}
