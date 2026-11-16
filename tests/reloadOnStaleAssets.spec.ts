import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installReloadOnStaleAssets } from '../src/lib/reloadOnStaleAssets'

function preloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('installReloadOnStaleAssets', () => {
  const reload = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // Se instala una sola vez: cada install agrega otro listener a window.
  installReloadOnStaleAssets()

  it('recarga la pagina y evita que el error se propague', () => {
    const event = preloadError()

    expect(reload).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('no recarga en bucle si vuelve a fallar enseguida', () => {
    preloadError()
    const second = preloadError()

    expect(reload).toHaveBeenCalledOnce()
    expect(second.defaultPrevented).toBe(false)
  })

  it('vuelve a recargar pasado el intervalo', () => {
    vi.useFakeTimers()
    preloadError()
    vi.advanceTimersByTime(11_000)
    preloadError()

    expect(reload).toHaveBeenCalledTimes(2)
  })
})
