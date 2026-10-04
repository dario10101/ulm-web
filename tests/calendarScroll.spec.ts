import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DailyView from '../src/components/calendar/DailyView.vue'
import WeeklyView from '../src/components/calendar/WeeklyView.vue'

/**
 * La vista debe abrirse mostrando la hora actual arriba del todo. Como jsdom no
 * calcula layout, no se puede mirar el scrollTop: se espia a quien lo aplica y
 * se comprueba a que fila de hora apunta.
 */
const scrollSpy = vi.fn()

vi.mock('@/lib/dom', () => ({
  scrollElementIntoContainer: (container: unknown, target: unknown) => scrollSpy(container, target),
  stickyInset: () => 0,
}))

vi.mock('@/composables/useCategories', async () => {
  const { ref } = await import('vue')
  const categories = ref([{ id: 1, name: 'Salud', priority: 1, status: 'ENABLED' }])
  return { useCategories: () => ({ categories, categoryName: () => 'Salud' }) }
})

function targetHourLabel(): string | undefined {
  const target = scrollSpy.mock.calls.at(-1)?.[1] as HTMLElement | null | undefined
  return target?.textContent?.trim()
}

describe('DailyView: hora visible al abrir', () => {
  beforeEach(() => {
    scrollSpy.mockClear()
    // Solo Date: setTimeout tiene que seguir siendo real para flushPromises.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 26, 13, 41))
  })

  afterEach(() => vi.useRealTimers())

  it('apunta a la hora actual cuando los datos ya estaban cargados al montar', async () => {
    mount(DailyView, {
      props: { date: '2026-09-26', occurrences: [], events: [], loading: false, error: null },
    })
    await flushPromises()

    expect(targetHourLabel()).toContain('1:00 PM')
  })

  // Secuencia real de useCalendarSection: el fetch guarda las ocurrencias y
  // recien en un flush posterior apaga `loading`. Mientras `loading` sigue en
  // true el grid no existe, asi que no hay contenedor al que scrollear: el
  // disparo tiene que ser la aparicion del grid, no la llegada de los datos.
  it('apunta a la hora actual aunque el grid aparezca despues de los datos', async () => {
    const wrapper = mount(DailyView, {
      props: { date: '2026-09-26', occurrences: [], events: [], loading: true, error: null },
    })
    await flushPromises()

    await wrapper.setProps({ occurrences: [] })
    await flushPromises()
    await wrapper.setProps({ loading: false })
    await flushPromises()

    expect(targetHourLabel()).toContain('1:00 PM')
  })

  it('usa la hora por defecto si el dia mostrado no es hoy', async () => {
    mount(DailyView, {
      props: { date: '2026-09-30', occurrences: [], events: [], loading: false, error: null },
    })
    await flushPromises()

    expect(targetHourLabel()).toContain('8:00 AM')
  })
})

describe('WeeklyView: hora visible al abrir', () => {
  beforeEach(() => {
    scrollSpy.mockClear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 26, 13, 41))
  })

  afterEach(() => vi.useRealTimers())

  function weekProps(weekStart: string) {
    return {
      weekStart,
      occurrences: [],
      events: [],
      loading: true,
      error: null,
      hasCategories: true,
    }
  }

  it('apunta a la hora actual aunque el grid aparezca despues de los datos', async () => {
    // 2026-09-26 es sabado: esta semana arranca el lunes 21.
    const wrapper = mount(WeeklyView, { props: weekProps('2026-09-21') })
    await flushPromises()

    await wrapper.setProps({ occurrences: [] })
    await flushPromises()
    await wrapper.setProps({ loading: false })
    await flushPromises()

    expect(targetHourLabel()).toContain('1:00 PM')
  })

  it('usa la hora por defecto si la semana mostrada no incluye hoy', async () => {
    const wrapper = mount(WeeklyView, { props: weekProps('2026-10-05') })
    await wrapper.setProps({ loading: false })
    await flushPromises()

    expect(targetHourLabel()).toContain('8:00 AM')
  })
})
