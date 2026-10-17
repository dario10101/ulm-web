import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import type { EnglishLevelBank, EnglishWordAdmin } from '@/types/english'

import EnglishBankPanel from '../src/components/params/EnglishBankPanel.vue'
import { mockApi } from './helpers/fetchMock'

function level(overrides: Partial<EnglishLevelBank> = {}): EnglishLevelBank {
  return {
    level: 'A1',
    list_total: 840,
    imported: 0,
    approved: 0,
    review: 0,
    pending: 0,
    disabled: 0,
    processable: 0,
    full: false,
    ...overrides,
  }
}

const WORD: EnglishWordAdmin = {
  id: 7,
  lemma: 'apple',
  pos: 'noun',
  level: 'A1',
  status: 'APPROVED',
  status_reason: null,
  accepted_answers: [],
  image: {
    url: 'https://img.example/apple/0.png',
    source: 'arasaac',
    license: 'CC BY-NC-SA 4.0',
    attribution: 'ARASAAC',
    page_url: null,
  },
  has_content: true,
}

async function mountPanel() {
  const wrapper = mount(EnglishBankPanel, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('EnglishBankPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('fills a level: imports, then processes batches until nothing remains', async () => {
    let batches = 0
    const fetch = mockApi({
      'GET /system/english/levels': { status: 200, body: [level()] },
      'GET /system/english/words': { status: 200, body: { items: [], total: 0 } },
      'POST /system/english/levels/A1/import': { status: 200, body: { added: 20 } },
    })
    // Dos lotes: el primero deja 10 pendientes, el segundo termina.
    const base = fetch.getMockImplementation()!
    fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (input.endsWith('/levels/A1/process')) {
        batches += 1
        const body =
          batches === 1
            ? { processed: 10, approved: 9, sent_to_review: 1, remaining: 10 }
            : { processed: 10, approved: 10, sent_to_review: 0, remaining: 0 }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
      }
      return base(input, init)
    })
    const wrapper = await mountPanel()

    await wrapper.find('[data-test="fill-A1"]').trigger('click')
    await flushPromises()

    expect(batches).toBe(2)
    expect(wrapper.find('[data-test="fill-summary"]').text()).toBe(
      'A1: 20 words added, 19 approved, 1 sent to review.',
    )
  })

  it('asks before filling a full level again', async () => {
    const fetch = mockApi({
      'GET /system/english/levels': {
        status: 200,
        body: [level({ imported: 840, approved: 840, full: true })],
      },
      'GET /system/english/words': { status: 200, body: { items: [], total: 0 } },
      'POST /system/english/levels/A1/import': { status: 200, body: { added: 0 } },
      'POST /system/english/levels/A1/process': {
        status: 200,
        body: { processed: 0, approved: 0, sent_to_review: 0, remaining: 0 },
      },
    })
    const wrapper = await mountPanel()

    await wrapper.find('[data-test="fill-A1"]').trigger('click')
    expect(wrapper.text()).toContain('This bank is already full')
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/import'))).toBe(false)

    await wrapper.find('[data-test="confirm"]').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls.some(([url]) => url.endsWith('/import'))).toBe(true)
    expect(wrapper.find('[data-test="fill-summary"]').text()).toBe('A1: nothing new to fill.')
  })

  it('shows the error and lets the admin resume', async () => {
    mockApi({
      'GET /system/english/levels': { status: 200, body: [level()] },
      'GET /system/english/words': { status: 200, body: { items: [], total: 0 } },
      'POST /system/english/levels/A1/import': { status: 200, body: { added: 100 } },
      'POST /system/english/levels/A1/process': {
        status: 502,
        body: { detail: 'No se pudo obtener respuesta del proveedor de IA' },
      },
    })
    const wrapper = await mountPanel()

    await wrapper.find('[data-test="fill-A1"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="bank-error"]').text()).toContain('Click "Fill bank" again')
    expect(wrapper.find('[data-test="fill-A1"]').attributes('disabled')).toBeUndefined()
  })

  it('changes the image and disables a word', async () => {
    const fetch = mockApi({
      'GET /system/english/levels': { status: 200, body: [level({ approved: 1 })] },
      'GET /system/english/words': { status: 200, body: { items: [WORD], total: 1 } },
      'POST /system/english/words/7/next-image': {
        status: 200,
        body: { ...WORD, image: { ...WORD.image!, url: 'https://img.example/apple/1.png' } },
      },
      'PATCH /system/english/words/7': { status: 200, body: { ...WORD, status: 'DISABLED' } },
    })
    const wrapper = await mountPanel()

    await wrapper.find('[data-test="next-image"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('img').attributes('src')).toBe('https://img.example/apple/1.png')

    await wrapper.find('[data-test="toggle-word"]').trigger('click')
    await flushPromises()
    const patch = fetch.mock.calls.find(([, init]) => init?.method === 'PATCH')!
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: 'DISABLED' })
    expect(wrapper.find('[data-test="toggle-word"]').text()).toBe('Enable')
  })
})
