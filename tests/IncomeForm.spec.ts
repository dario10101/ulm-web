import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IncomeOptions, InterestIncome } from '../src/types/income'

vi.mock('@/services/incomesApi', () => ({
  getIncomeOptions: vi.fn(),
  createDirectIncome: vi.fn(),
  updateDirectIncome: vi.fn(),
  createInterestIncome: vi.fn(),
  updateInterestIncome: vi.fn(),
}))

const OPTIONS: IncomeOptions = {
  sources: [
    { id: 1, name: 'Salario', type: 'DIRECT' },
    { id: 2, name: 'Venta', type: 'DIRECT' },
    { id: 4, name: 'Tyba', type: 'INTEREST' },
  ],
  // Cada subcategoria pertenece a una fuente; "EXTRA" existe en dos.
  subcategories: [
    { id: 1, source_id: 1, name: 'SALARIO BASE', type: 'DIRECT' },
    { id: 2, source_id: 1, name: 'EXTRA', type: 'DIRECT' },
    { id: 3, source_id: 4, name: 'RENDIMIENTOS', type: 'INTEREST' },
    { id: 5, source_id: 2, name: 'EXTRA', type: 'DIRECT' },
  ],
  tags: [{ id: 9, name: 'RECURRING', color_key: 'violet', status: 'ENABLED' }],
  interest_end_balances: [{ source_id: 4, period: '2026-07', end_of_month_amount: 3_000_000 }],
}

// El cache de opciones vive a nivel de modulo (useIncomeOptions): se
// reimporta todo en cada test para que no se filtre estado entre ellos.
async function load() {
  vi.resetModules()
  const api = await import('@/services/incomesApi')
  vi.mocked(api.getIncomeOptions).mockResolvedValue(structuredClone(OPTIONS))
  const { default: IncomeForm } = await import('../src/components/quick-add/IncomeForm.vue')
  const { default: DirectIncomeForm } =
    await import('../src/components/quick-add/income/DirectIncomeForm.vue')
  const { default: InterestIncomeForm } =
    await import('../src/components/quick-add/income/InterestIncomeForm.vue')
  return { api, IncomeForm, DirectIncomeForm, InterestIncomeForm }
}

function input(wrapper: ReturnType<typeof mount>, testId: string): HTMLInputElement {
  return wrapper.get(`[data-test="${testId}"] input`).element as HTMLInputElement
}

// Fecha fija: los defaults (fecha de hoy, mes anterior) dependen del reloj.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 27, 10, 0))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('IncomeForm', () => {
  it('pide las opciones una sola vez aunque se alterne entre direct e interest', async () => {
    const { api, IncomeForm } = await load()
    const wrapper = mount(IncomeForm)
    await flushPromises()
    expect(wrapper.text()).toContain('New income')

    await wrapper.get('[data-test="income-kind-interest"]').trigger('click')
    await wrapper.get('[data-test="income-kind-direct"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('New income')
    expect(api.getIncomeOptions).toHaveBeenCalledTimes(1)
  })
})

describe('DirectIncomeForm', () => {
  it('al cambiar el mes conserva el dia o baja al ultimo valido', async () => {
    vi.setSystemTime(new Date(2026, 2, 31))
    const { DirectIncomeForm } = await load()
    const wrapper = mount(DirectIncomeForm)
    const date = wrapper.get('input[type="date"]').element as HTMLInputElement
    expect(date.value).toBe('2026-03-31')

    await wrapper.get('[data-test="direct-month"]').setValue('1')
    expect(date.value).toBe('2026-02-28')
  })

  it('solo ofrece fuentes DIRECT y las subcategorias de la fuente elegida', async () => {
    const { DirectIncomeForm } = await load()
    const wrapper = mount(DirectIncomeForm)
    await flushPromises()

    expect(wrapper.get('[data-test="direct-source"]').text()).not.toContain('Tyba')
    expect(wrapper.text()).toContain('Select a source first.')

    await wrapper.get('[data-test="direct-source"]').setValue('1')
    expect(wrapper.find('[data-test="subcategory-5"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="subcategory-1"]').classes()).toContain('border-accent')

    // Al cambiar de fuente la subcategoria pasa a la primera de la nueva.
    await wrapper.get('[data-test="subcategory-2"]').trigger('click')
    await wrapper.get('[data-test="direct-source"]').setValue('2')
    expect(wrapper.find('[data-test="subcategory-1"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="subcategory-5"]').classes()).toContain('border-accent')
  })

  it('envia monto con decimales, tags y nota', async () => {
    const { api, DirectIncomeForm } = await load()
    vi.mocked(api.createDirectIncome).mockResolvedValue({} as never)
    const wrapper = mount(DirectIncomeForm)
    await flushPromises()

    await wrapper.get('[data-test="direct-amount"] input').setValue('3500000,5')
    expect(input(wrapper, 'direct-amount').value).toBe('3.500.000,5')
    await wrapper.get('[data-test="direct-source"]').setValue('1')
    await wrapper.get('[data-test="tag-9"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.createDirectIncome).toHaveBeenCalledWith({
      amount: 3500000.5,
      recorded_on: '2026-09-27',
      note: null,
      source_id: 1,
      subcategory_id: 1,
      tag_ids: [9],
    })
    expect(wrapper.text()).toContain('Saved.')
  })
})

describe('InterestIncomeForm', () => {
  it('por defecto registra el mes anterior; en enero, diciembre del anio previo', async () => {
    vi.setSystemTime(new Date(2026, 0, 15))
    const { InterestIncomeForm } = await load()
    const wrapper = mount(InterestIncomeForm)
    const month = wrapper.get('[data-test="interest-month"]').element as HTMLSelectElement
    const year = wrapper.get('[data-test="interest-year"]').element as HTMLSelectElement
    expect(month.value).toBe('11')
    expect(year.value).toBe('2025')
  })

  it('ofrece el saldo del mes anterior desde el cache y calcula el interes', async () => {
    const { api, InterestIncomeForm } = await load()
    vi.mocked(api.createInterestIncome).mockResolvedValue({
      source: { id: 4 },
      recorded_on: '2026-08-01',
      end_of_month_amount: 3_550_000,
    } as InterestIncome)
    const wrapper = mount(InterestIncomeForm)
    await flushPromises()

    // Periodo por defecto: agosto. Tyba tiene saldo final de julio en las opciones.
    await wrapper.get('[data-test="use-previous-balance"]').trigger('click')
    expect(input(wrapper, 'start-balance').value).toBe('3.000.000')

    await wrapper.get('[data-test="deposits"] input').setValue('500000')
    await wrapper.get('[data-test="end-balance"] input').setValue('3550000,25')
    expect(input(wrapper, 'interest-value').value).toBe('50.000,25')
    expect(input(wrapper, 'interest-value').readOnly).toBe(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.createInterestIncome).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50000.25,
        recorded_on: '2026-08-01',
        start_of_month_amount: 3_000_000,
        end_of_month_amount: 3550000.25,
        deposits_amount: 500000,
        withdrawals_amount: 0,
        source_id: 4,
        // RENDIMIENTOS (INTEREST) antes que EXTRA (ALL), aunque tenga id mayor.
        subcategory_id: 3,
      }),
    )
    // Septiembre ahora puede ofrecer el saldo de agosto recien guardado,
    // sin volver a pedir las opciones.
    await wrapper.get('[data-test="interest-month"]').setValue('8')
    expect(wrapper.get('[data-test="use-previous-balance"]').text()).toContain('3.550.000')
    expect(api.getIncomeOptions).toHaveBeenCalledTimes(1)
  })

  it('en manual el interes es editable, parte del calculado y acepta negativos', async () => {
    const { InterestIncomeForm } = await load()
    const wrapper = mount(InterestIncomeForm)
    await wrapper.get('[data-test="start-balance"] input').setValue('1000000')
    await wrapper.get('[data-test="end-balance"] input').setValue('1010000')

    await wrapper.get('[data-test="mode-manual"]').trigger('click')
    expect(input(wrapper, 'interest-value').readOnly).toBe(false)
    expect(input(wrapper, 'interest-value').value).toBe('10.000')

    await wrapper.get('[data-test="interest-value"] input').setValue('-2000')
    expect(input(wrapper, 'interest-value').value).toBe('-2.000')
    expect(wrapper.text()).toContain('Balances suggest $ 10.000')
  })

  it('al editar un registro sin saldos abre en manual con su interes', async () => {
    const { InterestIncomeForm } = await load()
    const record = {
      id: 7,
      amount: 8641,
      recorded_on: '2026-07-01',
      start_of_month_amount: null,
      end_of_month_amount: null,
      deposits_amount: 0,
      withdrawals_amount: 0,
      note: 'Banco',
      source: { id: 4, name: 'Tyba', type: 'INTEREST' },
      subcategory: { id: 3, source_id: 4, name: 'RENDIMIENTOS', type: 'INTEREST' },
      tags: [],
    } as unknown as InterestIncome
    const wrapper = mount(InterestIncomeForm, { props: { record } })

    expect((wrapper.get('[data-test="interest-month"]').element as HTMLSelectElement).value).toBe(
      '6',
    )
    expect(input(wrapper, 'interest-value').value).toBe('8.641')
    expect(input(wrapper, 'interest-value').readOnly).toBe(false)
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Banco')
    expect(wrapper.text()).toContain('Cancel')
  })
})
