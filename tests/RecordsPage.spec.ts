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
})
