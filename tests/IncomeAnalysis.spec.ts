import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IncomeOptions, IncomeSummary } from '../src/types/income'

vi.mock('@/services/incomesApi', () => ({
  getIncomeOptions: vi.fn(),
  summarizeIncomes: vi.fn(),
}))

const OPTIONS: IncomeOptions = {
  sources: [
    { id: 1, name: 'Salario', type: 'DIRECT' },
    { id: 3, name: 'Tyba', type: 'INTEREST' },
  ],
  subcategories: [
    { id: 1, source_id: 1, name: 'SALARIO BASE', type: 'DIRECT' },
    { id: 2, source_id: 1, name: 'EXTRA', type: 'DIRECT' },
    { id: 3, source_id: 3, name: 'RENDIMIENTOS', type: 'INTEREST' },
  ],
  tags: [],
  interest_end_balances: [],
}

function summary(partial: Partial<IncomeSummary>): IncomeSummary {
  return {
    group_by: 'source',
    stack_by: null,
    total: 1040,
    count: 3,
    direct_total: 1000,
    interest_total: 40,
    buckets: [],
    ...partial,
  }
}

async function load() {
  vi.resetModules()
  const api = await import('@/services/incomesApi')
  vi.mocked(api.getIncomeOptions).mockResolvedValue(structuredClone(OPTIONS))
  const { default: IncomeAnalysis } =
    await import('../src/components/analytics/finance/IncomeAnalysis.vue')
  return { api, IncomeAnalysis }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 3))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('IncomeAnalysis', () => {
  it('por fuente: dona con cada fuente y KPI de ingreso pasivo', async () => {
    const { api, IncomeAnalysis } = await load()
    vi.mocked(api.summarizeIncomes).mockResolvedValue(
      summary({
        buckets: [
          {
            key: '1',
            label: 'Salario',
            parent_label: null,
            color_key: null,
            total: 1000,
            count: 2,
            segments: [],
          },
          {
            key: '3',
            label: 'Tyba',
            parent_label: null,
            color_key: null,
            total: 40,
            count: 1,
            segments: [],
          },
        ],
      }),
    )
    const wrapper = mount(IncomeAnalysis, { props: { view: 'source' } })
    await flushPromises()

    expect(api.summarizeIncomes).toHaveBeenCalledWith(
      'source',
      expect.objectContaining({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        stackBy: undefined,
      }),
    )
    expect(wrapper.text()).toContain('Income by source')
    expect(wrapper.text()).toContain('Passive income')
    expect(wrapper.text()).toContain('4% of the total comes from interest')
    expect(wrapper.text()).toContain('Direct vs interest')
  })

  it('por subcategoria: toma una unica fuente por defecto en cuanto llegan las opciones', async () => {
    const { api, IncomeAnalysis } = await load()
    vi.mocked(api.summarizeIncomes).mockResolvedValue(summary({ group_by: 'subcategory' }))
    const wrapper = mount(IncomeAnalysis, { props: { view: 'subcategory' } })
    await flushPromises()

    expect(api.summarizeIncomes).toHaveBeenCalledTimes(1)
    expect(api.summarizeIncomes).toHaveBeenCalledWith(
      'subcategory',
      expect.objectContaining({ sourceIds: [1] }),
    )
    expect(wrapper.text()).toContain('Income by subcategory · Salario')
  })

  it('por mes: 12 columnas del año elegido, apiladas por fuente', async () => {
    const { api, IncomeAnalysis } = await load()
    vi.mocked(api.summarizeIncomes).mockResolvedValue(
      summary({
        group_by: 'month',
        stack_by: 'source',
        buckets: [
          {
            key: '2026-02',
            label: '2026-02',
            parent_label: null,
            color_key: null,
            total: 1040,
            count: 3,
            segments: [
              { key: '1', label: 'Salario', total: 1000 },
              { key: '3', label: 'Tyba', total: 40 },
            ],
          },
        ],
      }),
    )
    const wrapper = mount(IncomeAnalysis, { props: { view: 'month' } })
    await flushPromises()

    expect(api.summarizeIncomes).toHaveBeenCalledWith(
      'month',
      expect.objectContaining({ stackBy: 'source', startDate: '2026-01-01' }),
    )
    expect(wrapper.findAll('[data-test^="column-2026-"]')).toHaveLength(12)
    expect(wrapper.text()).toContain('Breakdown by source')
    // Año en curso: promedio sobre los meses transcurridos (10 a octubre) + proyeccion.
    expect(wrapper.text()).toContain('Over 10 elapsed months')
    expect(wrapper.text()).toContain('Year projection')
  })
})
