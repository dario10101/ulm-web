import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import IncomeRecords from '../src/components/records/IncomeRecords.vue'
import * as api from '../src/services/incomesApi'
import type { DirectIncome, IncomePage, InterestIncome } from '../src/types/income'

vi.mock('@/services/incomesApi', () => ({
  getIncomeOptions: vi.fn(() =>
    Promise.resolve({ sources: [], subcategories: [], tags: [], interest_end_balances: [] }),
  ),
  listIncomes: vi.fn(),
  deleteIncome: vi.fn(() => Promise.resolve()),
}))

const source = { id: 4, name: 'Tyba', type: 'INTEREST' as const }
const subcategory = { id: 3, name: 'RENDIMIENTOS', type: 'INTEREST' as const }

function page<T>(items: T[]): IncomePage<T> {
  return { items, total: items.length, page: 1, page_size: 10, total_pages: 1 }
}

const direct = {
  id: 1,
  amount: 2750000,
  recorded_on: '2026-09-15',
  note: 'Quincena',
  source: { id: 1, name: 'Salario', type: 'DIRECT' },
  subcategory: { id: 1, name: 'SALARIO BASE', type: 'DIRECT' },
  tags: [],
} as unknown as DirectIncome

const interest = {
  id: 2,
  amount: -10000.5,
  recorded_on: '2026-04-01',
  start_of_month_amount: 2500000,
  end_of_month_amount: 2489999.5,
  deposits_amount: 0,
  withdrawals_amount: 0,
  note: null,
  source,
  subcategory,
  tags: [],
} as unknown as InterestIncome

beforeEach(() => {
  vi.mocked(api.listIncomes).mockImplementation(((kind: string) =>
    Promise.resolve(kind === 'direct' ? page([direct]) : page([interest]))) as never)
})
afterEach(() => vi.clearAllMocks())

describe('IncomeRecords', () => {
  it('lista los directos del anio en curso al abrir', async () => {
    const wrapper = mount(IncomeRecords)
    await flushPromises()

    const [kind, params] = vi.mocked(api.listIncomes).mock.calls[0]
    expect(kind).toBe('direct')
    expect(params).toMatchObject({ startDate: `${new Date().getFullYear()}-01-01`, page: 1 })
    expect(wrapper.text()).toContain('Salario')
    expect(wrapper.text()).toContain('$ 2.750.000')
  })

  it('al pasar a intereses los pide una vez y muestra el periodo y el interes negativo', async () => {
    const wrapper = mount(IncomeRecords)
    await flushPromises()

    await wrapper.get('[data-test="records-income-interest"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="records-income-direct"]').trigger('click')
    await wrapper.get('[data-test="records-income-interest"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(api.listIncomes).mock.calls.map(([kind]) => kind)).toEqual([
      'direct',
      'interest',
    ])
    expect(wrapper.text()).toContain('Apr 2026')
    expect(wrapper.text()).toContain('$ -10.000,50')
  })

  it('borra con confirmacion y recarga la lista', async () => {
    const wrapper = mount(IncomeRecords)
    await flushPromises()

    await wrapper.get('button[title="Delete record"]').trigger('click')
    await wrapper.get('[data-test="confirm-delete"]').trigger('click')
    await flushPromises()

    expect(api.deleteIncome).toHaveBeenCalledWith('direct', 1)
    expect(api.listIncomes).toHaveBeenCalledTimes(2)
  })
})
