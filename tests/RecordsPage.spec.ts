import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RecordsPage from '../src/views/admin/RecordsPage.vue'

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lista los registros de peso obtenidos de la API', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: 1,
                user_id: 1,
                weight_kg: 72.4,
                recorded_on: '2026-09-10',
                note: 'post workout',
                created_at: '2026-09-10T00:00:00Z',
                updated_at: null,
              },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
          }),
      }),
    ) as unknown as typeof fetch

    const wrapper = mount(RecordsPage)
    await flushPromises()

    expect(wrapper.text()).toContain('72.4 kg')
    expect(wrapper.text()).toContain('post workout')
  })

  it('muestra un mensaje de error si la API falla', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch

    const wrapper = mount(RecordsPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load weight records.')
  })

  it('edita un registro y recarga la lista', async () => {
    const calls: { url: string; method: string }[] = []
    global.fetch = vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? 'GET' })
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pageConUnRegistro()),
      })
    }) as unknown as typeof fetch

    const wrapper = mount(RecordsPage)
    await flushPromises()

    await wrapper.find('button[title="Edit record"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(true)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const put = calls.find((c) => c.method === 'PUT')
    expect(put?.url).toContain('/weights/1')
    // tras guardar se vuelve a pedir la lista
    expect(calls.filter((c) => c.method === 'GET').length).toBeGreaterThan(1)
  })

  it('pide confirmacion antes de borrar y no llama a la API si se cancela', async () => {
    const calls: string[] = []
    global.fetch = vi.fn((url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pageConUnRegistro()),
      })
    }) as unknown as typeof fetch

    const wrapper = mount(RecordsPage)
    await flushPromises()

    await wrapper.find('button[title="Delete record"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain("This can't be undone")
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(false)
  })
})

/** Una pagina con un unico registro, suficiente para las acciones de fila. */
function pageConUnRegistro() {
  return {
    items: [
      {
        id: 1,
        user_id: 1,
        weight_kg: 72.4,
        recorded_on: '2026-09-10',
        note: 'post workout',
        created_at: '2026-09-10T00:00:00Z',
        updated_at: null,
      },
    ],
    total: 1,
    page: 1,
    page_size: 10,
    total_pages: 1,
  }
}
