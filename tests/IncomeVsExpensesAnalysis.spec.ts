import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import IncomeVsExpensesAnalysis from '../src/components/analytics/finance/IncomeVsExpensesAnalysis.vue'
import * as expensesApi from '../src/services/expensesApi'
import * as incomesApi from '../src/services/incomesApi'

vi.mock('@/services/incomesApi', () => ({ summarizeIncomes: vi.fn() }))
vi.mock('@/services/expensesApi', () => ({
  summarizeExpenses: vi.fn(),
  getExpenseOptions: vi.fn(() =>
    Promise.resolve({
      categories: [],
      payment_methods: [],
      tags: [{ id: 5, name: 'RECURRING', color_key: 'violet', status: 'ENABLED' }],
    }),
  ),
}))

function bucket(key: string, total: number, extra: Record<string, unknown> = {}) {
  return {
    key,
    label: key,
    icon_key: null,
    color_key: null,
    parent_label: null,
    total,
    count: 1,
    segments: [],
    ...extra,
  }
}

function summary(buckets: ReturnType<typeof bucket>[], total: number) {
  return {
    group_by: 'month',
    stack_by: null,
    total,
    count: buckets.length,
    direct_total: total,
    interest_total: 0,
    buckets,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 15)) // marzo 2026: ene-mar transcurridos
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('IncomeVsExpensesAnalysis', () => {
  it('mensual: pide ambos resumenes del año en curso y calcula neto y tasa de ahorro', async () => {
    vi.mocked(incomesApi.summarizeIncomes).mockResolvedValue(
      summary([bucket('2026-01', 1000), bucket('2026-02', 1000)], 2000) as never,
    )
    vi.mocked(expensesApi.summarizeExpenses).mockResolvedValue(
      summary([bucket('2026-01', 600), bucket('2026-02', 1200)], 1800) as never,
    )

    const wrapper = mount(IncomeVsExpensesAnalysis, { props: { view: 'month' } })
    await flushPromises()

    const query = { startDate: '2026-01-01', endDate: '2026-12-31', tagIds: undefined }
    expect(incomesApi.summarizeIncomes).toHaveBeenCalledWith('month', query)
    expect(expensesApi.summarizeExpenses).toHaveBeenCalledWith('month', query)

    const text = wrapper.text()
    expect(wrapper.findAll('[data-test^="group-2026-"]')).toHaveLength(12)
    // Neto 200 sobre 2000 = 10%; febrero (-200) es deficit.
    expect(text).toContain('$ 200')
    expect(text).toContain('10%')
    expect(text).toContain('1 month in deficit')
    // La tabla solo lista los meses transcurridos.
    expect(text).toContain('Mar 2026')
    expect(text).not.toContain('Apr 2026')
  })

  it('anual: cubre del primer al ultimo año con datos en cualquiera de las dos areas', async () => {
    vi.mocked(incomesApi.summarizeIncomes).mockResolvedValue(
      summary([bucket('2026', 5000)], 5000) as never,
    )
    vi.mocked(expensesApi.summarizeExpenses).mockResolvedValue(
      summary([bucket('2024', 100), bucket('2026', 4000)], 4100) as never,
    )

    const wrapper = mount(IncomeVsExpensesAnalysis, { props: { view: 'year' } })
    await flushPromises()

    expect(incomesApi.summarizeIncomes).toHaveBeenCalledWith('year', { tagIds: undefined })
    expect(wrapper.findAll('[data-test^="group-"]').map((g) => g.attributes('data-test'))).toEqual([
      'group-2024',
      'group-2025',
      'group-2026',
    ])
  })

  it('por tags: un solo pastel con ingresos y gastos del tag elegido', async () => {
    vi.mocked(incomesApi.summarizeIncomes).mockResolvedValue(
      summary([bucket('2026', 1000)], 1000) as never,
    )
    vi.mocked(expensesApi.summarizeExpenses).mockResolvedValue(
      summary([bucket('2026', 300)], 300) as never,
    )

    const wrapper = mount(IncomeVsExpensesAnalysis, { props: { view: 'tags' } })
    await flushPromises()

    // Toma el primer tag por defecto y filtra ambas areas por el.
    const query = { startDate: '2026-01-01', endDate: '2026-12-31', tagIds: [5] }
    expect(incomesApi.summarizeIncomes).toHaveBeenCalledWith('year', query)
    expect(expensesApi.summarizeExpenses).toHaveBeenCalledWith('year', query)

    const text = wrapper.text()
    expect(text).toContain('RECURRING · 2026')
    expect(wrapper.findAll('svg')).toHaveLength(1)
    expect(text).toContain('Total moved')
    expect(text).toContain('kept $ 700')
    expect(text).toContain('expenses are 30% of its income')
  })
})
