import { describe, expect, it } from 'vitest'

import {
  defaultExpenseFilters,
  expenseDateRange,
  expenseFilterQuery,
  patchExpenseFilters,
} from '@/lib/expenseFilters'

const TODAY = new Date(2026, 1, 14) // 14 feb 2026

describe('expenseFilters', () => {
  it('por defecto filtra el dia de hoy; con depth amplia a mes o año', () => {
    expect(expenseDateRange(defaultExpenseFilters(TODAY))).toEqual({
      start: '2026-02-14',
      end: '2026-02-14',
    })
    expect(expenseDateRange(defaultExpenseFilters(TODAY, 'month'))).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
    expect(expenseDateRange(defaultExpenseFilters(TODAY, 'year'))).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })

  it('sin año no filtra por fecha y limpia mes/dia en cascada', () => {
    const next = patchExpenseFilters(defaultExpenseFilters(TODAY), { year: null })
    expect(next.month).toBeNull()
    expect(next.day).toBeNull()
    expect(expenseDateRange(next)).toEqual({})
  })

  it('descarta un dia que no existe en el nuevo mes', () => {
    const state = patchExpenseFilters(defaultExpenseFilters(TODAY), { month: 1, day: 31 })
    expect(patchExpenseFilters(state, { month: 2 }).day).toBeNull()
  })

  it('en modo rango usa from/to y traduce el resto a parametros de API', () => {
    const state = patchExpenseFilters(defaultExpenseFilters(TODAY), {
      dateMode: 'range',
      rangeStart: '2026-01-01',
      categoryId: 3,
      tagIds: [1, 2],
      minAmount: '1000',
    })
    expect(expenseFilterQuery(state)).toEqual({
      startDate: '2026-01-01',
      endDate: undefined,
      categoryId: 3,
      paymentMethodId: undefined,
      tagIds: [1, 2],
      minAmount: 1000,
      maxAmount: undefined,
    })
  })
})
