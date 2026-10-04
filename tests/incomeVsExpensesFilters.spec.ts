import { describe, expect, it } from 'vitest'

import {
  defaultIncomeVsExpensesFilters,
  filtersForView,
  incomeVsExpensesQuery,
  patchIncomeVsExpensesFilters,
} from '../src/lib/incomeVsExpensesFilters'

const TODAY = new Date(2026, 9, 4)
const base = defaultIncomeVsExpensesFilters(TODAY)

describe('incomeVsExpensesFilters', () => {
  it('sin año no hay mes', () => {
    const withMonth = patchIncomeVsExpensesFilters(base, { month: 3 })
    expect(patchIncomeVsExpensesFilters(withMonth, { year: null }).month).toBeNull()
  })

  it('mensual: año obligatorio (el actual si no habia) y sin mes', () => {
    const anyYear = patchIncomeVsExpensesFilters(base, { year: null })
    expect(filtersForView(anyYear, 'month', null, TODAY)).toMatchObject({ year: 2026, month: null })
    expect(incomeVsExpensesQuery(base, 'month')).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      tagIds: undefined,
    })
  })

  it('anual: ignora la fecha, solo tags', () => {
    const state = patchIncomeVsExpensesFilters(base, { month: 2, tagIds: [4] })
    expect(incomeVsExpensesQuery(state, 'year')).toEqual({ tagIds: [4] })
  })

  it('por tags: año y mes opcionales y un unico tag (el de la vista, no los multi)', () => {
    const state = patchIncomeVsExpensesFilters(base, { month: 2, tagIds: [4, 5], tagId: 7 })
    expect(incomeVsExpensesQuery(state, 'tags')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      tagIds: [7],
    })
    // Las vistas mensual/anual conservan su multi-seleccion intacta.
    expect(incomeVsExpensesQuery(state, 'year')).toEqual({ tagIds: [4, 5] })
    const allTime = patchIncomeVsExpensesFilters(state, { year: null })
    expect(incomeVsExpensesQuery(allTime, 'tags')).toEqual({ tagIds: [7] })
  })

  it('por tags: sin tag elegido toma el primero disponible', () => {
    expect(filtersForView(base, 'tags', 3, TODAY).tagId).toBe(3)
    const chosen = patchIncomeVsExpensesFilters(base, { tagId: 9 })
    expect(filtersForView(chosen, 'tags', 3, TODAY).tagId).toBe(9)
  })
})
