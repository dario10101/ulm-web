import { afterEach, describe, expect, it, vi } from 'vitest'

import { postForm, postJson } from '../src/lib/http'
import { move } from '../src/lib/reorder'

describe('move', () => {
  it('sube y baja un elemento sin tocar la lista original', () => {
    const list = ['a', 'b', 'c']

    expect(move(list, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(move(list, 1, 1)).toEqual(['a', 'c', 'b'])
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('en los extremos no hace nada', () => {
    expect(move(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(move(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })
})

describe('postForm', () => {
  afterEach(() => vi.restoreAllMocks())

  function stubFetch() {
    const fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    )
    global.fetch = fetch as unknown as typeof globalThis.fetch
    return fetch
  }

  it('no fija Content-Type: el navegador pone el boundary del multipart', async () => {
    const fetch = stubFetch()
    const form = new FormData()
    form.append('file', new File(['x'], 'x.md'))

    await postForm('/upload', form)

    const init = (fetch.mock.calls[0] as unknown[])[1] as RequestInit
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('el JSON sigue llevando su Content-Type', async () => {
    const fetch = stubFetch()

    await postJson('/x', { a: 1 })

    const init = (fetch.mock.calls[0] as unknown[])[1] as RequestInit
    expect(init.headers).toHaveProperty('Content-Type', 'application/json')
  })
})
