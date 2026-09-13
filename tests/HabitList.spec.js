import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import HabitList from '../src/components/HabitList.vue'

describe('HabitList', () => {
  beforeEach(() => {
    // Simula que el backend no esta disponible para forzar el camino de datos dummy
    global.fetch = vi.fn(() => Promise.reject(new Error('network error')))
  })

  it('muestra los habitos de ejemplo cuando el backend no responde', async () => {
    const wrapper = mount(HabitList)
    await flushPromises()

    expect(wrapper.text()).toContain('Leer 20 minutos')
    expect(wrapper.text()).toContain('datos de ejemplo')
  })
})
