/**
 * Estado de filtros de "Finance analysis -> Income" y sus reglas por vista.
 * Objeto plano inmutable (mismo patron que expenseFilters.ts); la logica
 * vive aca y no en los componentes para poder probarla sin montar nada.
 */
import { expenseDateRange, patchExpenseFilters, type DateFilterFields } from '@/lib/expenseFilters'
import type { IncomeSummaryParams } from '@/services/incomesApi'
import type { IncomeGroupBy, IncomeKind } from '@/types/income'

export type IncomeAnalysisView = 'source' | 'subcategory' | 'tags' | 'year' | 'month'
export type IncomeKindFilter = 'all' | IncomeKind

export const VIEW_GROUP_BY: Record<IncomeAnalysisView, IncomeGroupBy> = {
  source: 'source',
  subcategory: 'subcategory',
  tags: 'tag',
  year: 'year',
  month: 'month',
}

export interface IncomeAnalysisFilters extends DateFilterFields {
  /** Directos, intereses o ambos (default). */
  kind: IncomeKindFilter
  /** Multi-seleccion; vacio = todas. */
  sourceIds: number[]
  /** Solo aplica con exactamente una fuente elegida (son de esa fuente). */
  subcategoryIds: number[]
  tagIds: number[]
}

export function defaultIncomeAnalysisFilters(today: Date = new Date()): IncomeAnalysisFilters {
  return {
    dateMode: 'ymd',
    year: today.getFullYear(),
    month: null,
    day: null,
    rangeStart: '',
    rangeEnd: '',
    kind: 'all',
    sourceIds: [],
    subcategoryIds: [],
    tagIds: [],
  }
}

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

/**
 * Aplica un cambio respetando las reglas: jerarquia de fechas (ver
 * patchExpenseFilters) y subcategorias validas solo con una unica fuente.
 * Si la fuente cambia, las subcategorias elegidas eran de la anterior: se limpian.
 */
export function patchIncomeAnalysisFilters(
  state: IncomeAnalysisFilters,
  patch: Partial<IncomeAnalysisFilters>,
): IncomeAnalysisFilters {
  const next = patchExpenseFilters(state, patch)
  if (next.sourceIds.length !== 1 || !sameIds(next.sourceIds, state.sourceIds)) {
    next.subcategoryIds =
      patch.subcategoryIds && next.sourceIds.length === 1 ? next.subcategoryIds : []
  }
  return next
}

/**
 * Ajusta los filtros al entrar a una vista:
 * - month: un unico año (el elegido, o el actual), sin mes/dia ni rango: el
 *   grafico son los 12 meses de ese año.
 * - year: compara años, asi que se quita el año (si lo habia) para ver todos.
 * - subcategory: exige una unica fuente; si no la hay, se toma la primera
 *   de la seleccion o `fallbackSourceId`.
 */
export function filtersForView(
  state: IncomeAnalysisFilters,
  view: IncomeAnalysisView,
  fallbackSourceId: number | null,
  today: Date = new Date(),
): IncomeAnalysisFilters {
  if (view === 'month') {
    return patchIncomeAnalysisFilters(state, {
      dateMode: 'ymd',
      year: state.dateMode === 'ymd' && state.year ? state.year : today.getFullYear(),
      month: null,
      day: null,
    })
  }
  if (view === 'year' && state.dateMode === 'ymd' && state.year) {
    return patchIncomeAnalysisFilters(state, { year: null })
  }
  if (view === 'subcategory' && state.sourceIds.length !== 1) {
    const sourceId = state.sourceIds[0] ?? fallbackSourceId
    return patchIncomeAnalysisFilters(state, { sourceIds: sourceId === null ? [] : [sourceId] })
  }
  return state
}

/** Con una sola fuente las columnas apiladas muestran sus subcategorias. */
export function stackDimension(state: IncomeAnalysisFilters): 'source' | 'subcategory' {
  return state.sourceIds.length === 1 ? 'subcategory' : 'source'
}

export function incomeAnalysisQuery(
  state: IncomeAnalysisFilters,
  view: IncomeAnalysisView,
): IncomeSummaryParams {
  const range = expenseDateRange(state)
  const timeSeries = view === 'year' || view === 'month'
  return {
    stackBy: timeSeries ? stackDimension(state) : undefined,
    kind: state.kind === 'all' ? undefined : state.kind,
    startDate: range.start,
    endDate: range.end,
    sourceIds: state.sourceIds.length ? state.sourceIds : undefined,
    subcategoryIds: state.subcategoryIds.length ? state.subcategoryIds : undefined,
    tagIds: state.tagIds.length ? state.tagIds : undefined,
  }
}
