import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StackedColumnChart from '../src/components/charts/StackedColumnChart.vue'

const items = [
  {
    key: '2026-01',
    label: 'Jan',
    segments: [
      { key: '1', label: 'Salario', value: 300, colorClass: 'text-sky-400' },
      { key: '2', label: 'Tyba', value: 100, colorClass: 'text-amber-400' },
    ],
  },
  {
    key: '2026-02',
    label: 'Feb',
    segments: [
      { key: '1', label: 'Salario', value: 300, colorClass: 'text-sky-400' },
      { key: '2', label: 'Tyba', value: -100, colorClass: 'text-amber-400' },
    ],
  },
]

describe('StackedColumnChart', () => {
  it('apila positivos hacia arriba y negativos hacia abajo del cero', async () => {
    const wrapper = mount(StackedColumnChart, { props: { items } })

    const feb = wrapper.get('[data-test="column-2026-02"]')
    const [positive, negative] = feb.findAll('.bg-current').map((el) => el.element as HTMLElement)
    expect(positive.classList).toContain('text-sky-400')
    expect(negative.classList).toContain('text-amber-400')
    // El contenedor negativo arranca en la linea de cero y baja.
    expect((negative.parentElement as HTMLElement).style.top).not.toBe('')
    // Con negativos, el eje incluye valores bajo cero.
    expect(wrapper.text()).toMatch(/-\d/)
  })

  it('el tooltip muestra el desglose y el total neto', async () => {
    const wrapper = mount(StackedColumnChart, {
      props: { items, format: (v: number) => `$${v}` },
    })

    await wrapper.get('[data-test="column-2026-02"]').trigger('pointerenter')

    const text = wrapper.text()
    expect(text).toContain('Salario')
    expect(text).toContain('$-100')
    expect(text).toMatch(/Total\s*\$200/)
  })

  it('muestra la variacion del total contra la columna anterior', () => {
    const wrapper = mount(StackedColumnChart, { props: { items, showDelta: true } })
    // 400 -> 200 = -50%
    expect(wrapper.text()).toContain('▼ 50%')
  })
})
