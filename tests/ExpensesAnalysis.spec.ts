import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ExpensesAnalysis from '../src/components/analytics/finance/ExpensesAnalysis.vue'
import * as expensesApi from '../src/services/expensesApi'
import type { ExpenseSummary, ExpenseSummarySegment } from '../src/types/expense'

vi.mock('@/services/expensesApi', () => ({
  summarizeExpenses: vi.fn(),
  getExpenseOptions: vi.fn(() =>
    Promise.resolve({ categories: [], payment_methods: [], tags: [] }),
  ),
}))

function segment(key: string, total: number, colorKey = 'lime'): ExpenseSummarySegment {
  return { key, label: `Cat ${key}`, icon_key: null, color_key: colorKey, total }
}

// 9 categorias en el mes: las 7 mayores con color propio, las 2 menores a "Other".
const segments = [
  segment('1', 900),
  segment('2', 800, 'sky'),
  segment('3', 700, 'sky'), // mismo color de catalogo que la 2
  segment('4', 600, 'amber'),
  segment('5', 500, 'rose'),
  segment('6', 400, 'violet'),
  segment('7', 300, 'teal'),
  segment('8', 20, 'pink'),
  segment('9', 10, 'pink'),
]
const total = segments.reduce((sum, s) => sum + s.total, 0)

function summary(groupBy: 'month' | 'year', key: string): ExpenseSummary {
  return {
    group_by: groupBy,
    total,
    count: 9,
    buckets: [{ key, label: key, icon_key: null, color_key: null, total, count: 9, segments }],
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 4))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('ExpensesAnalysis (mes / año apilados por categoria)', () => {
  it('apila las 7 categorias mayores y agrupa el resto en Other', async () => {
    vi.mocked(expensesApi.summarizeExpenses).mockResolvedValue(summary('month', '2026-03'))
    const wrapper = mount(ExpensesAnalysis, { props: { view: 'month' } })
    await flushPromises()

    const legend = wrapper.findAll('[data-test="category-legend"]')
    expect(legend).toHaveLength(8)
    expect(legend[7].text()).toContain('Other (2)')
    expect(legend[7].text()).toContain('$ 30')

    // Dos categorias del top con el mismo color de catalogo no se pintan igual.
    const colors = legend.map((li) => li.find('.bg-current').classes().join(' '))
    expect(new Set(colors).size).toBe(8)

    // La columna de marzo tiene un segmento por entrada de la leyenda.
    const column = wrapper.get('[data-test="column-2026-03"]')
    expect(column.findAll('.bg-current')).toHaveLength(8)
  })

  it('la vista anual arranca filtrada por el año en curso', async () => {
    vi.mocked(expensesApi.summarizeExpenses).mockResolvedValue(summary('year', '2026'))
    mount(ExpensesAnalysis, { props: { view: 'year' } })
    await flushPromises()

    expect(expensesApi.summarizeExpenses).toHaveBeenCalledWith(
      'year',
      expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-12-31' }),
    )
  })
})
