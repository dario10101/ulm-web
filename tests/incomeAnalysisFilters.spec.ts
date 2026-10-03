import { describe, expect, it } from 'vitest'

import {
  defaultIncomeAnalysisFilters,
  filtersForView,
  incomeAnalysisQuery,
  patchIncomeAnalysisFilters,
} from '../src/lib/incomeAnalysisFilters'

const TODAY = new Date(2026, 9, 3)
const base = defaultIncomeAnalysisFilters(TODAY)

describe('patchIncomeAnalysisFilters', () => {
  it('las subcategorias solo sobreviven con una unica fuente', () => {
    const single = patchIncomeAnalysisFilters(base, { sourceIds: [1], subcategoryIds: [5, 6] })
    expect(single.subcategoryIds).toEqual([5, 6])

    expect(patchIncomeAnalysisFilters(single, { sourceIds: [1, 2] }).subcategoryIds).toEqual([])
    expect(patchIncomeAnalysisFilters(single, { sourceIds: [] }).subcategoryIds).toEqual([])
  })

  it('cambiar a otra fuente unica limpia las subcategorias de la anterior', () => {
    const single = patchIncomeAnalysisFilters(base, { sourceIds: [1], subcategoryIds: [5] })
    expect(patchIncomeAnalysisFilters(single, { sourceIds: [2] }).subcategoryIds).toEqual([])
    // Otros cambios no las tocan.
    expect(patchIncomeAnalysisFilters(single, { tagIds: [9] }).subcategoryIds).toEqual([5])
  })
})

describe('filtersForView', () => {
  it('mes: un unico año (el actual si no habia), sin mes/dia ni rango', () => {
    const ranged = patchIncomeAnalysisFilters(base, { dateMode: 'range', rangeStart: '2025-01-01' })
    expect(filtersForView(ranged, 'month', null, TODAY)).toMatchObject({
      dateMode: 'ymd',
      year: 2026,
      month: null,
      day: null,
    })
    const withMonth = patchIncomeAnalysisFilters(base, { year: 2025, month: 3 })
    expect(filtersForView(withMonth, 'month', null, TODAY)).toMatchObject({
      year: 2025,
      month: null,
    })
  })

  it('año: abre el filtro a todos los años', () => {
    expect(filtersForView(base, 'year', null, TODAY).year).toBeNull()
  })

  it('subcategoria: exige una unica fuente', () => {
    expect(filtersForView(base, 'subcategory', 4, TODAY).sourceIds).toEqual([4])
    const two = patchIncomeAnalysisFilters(base, { sourceIds: [2, 3] })
    expect(filtersForView(two, 'subcategory', 4, TODAY).sourceIds).toEqual([2])
  })
})

describe('incomeAnalysisQuery', () => {
  it('apila por fuente, o por subcategoria con una sola fuente, solo en series de tiempo', () => {
    expect(incomeAnalysisQuery(base, 'year').stackBy).toBe('source')
    const single = patchIncomeAnalysisFilters(base, { sourceIds: [1] })
    expect(incomeAnalysisQuery(single, 'month').stackBy).toBe('subcategory')
    expect(incomeAnalysisQuery(single, 'source').stackBy).toBeUndefined()
  })

  it('traduce tipo, fechas y multi-selecciones', () => {
    const state = patchIncomeAnalysisFilters(base, { kind: 'interest', tagIds: [7], month: 2 })
    expect(incomeAnalysisQuery(state, 'source')).toEqual({
      stackBy: undefined,
      kind: 'interest',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      sourceIds: undefined,
      subcategoryIds: undefined,
      tagIds: [7],
    })
    expect(incomeAnalysisQuery(base, 'source').kind).toBeUndefined()
  })
})
