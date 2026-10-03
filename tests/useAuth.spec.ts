import { beforeEach, describe, expect, it } from 'vitest'

import { resetAuthState, useAuth } from '../src/composables/useAuth'
import { ME, mockApi } from './helpers/fetchMock'

describe('useAuth', () => {
  beforeEach(() => resetAuthState())

  it('carga el usuario de la sesion una sola vez', async () => {
    const fetch = mockApi({ 'GET /me': { status: 200, body: ME } })
    const { ensureLoaded, isAuthenticated, user } = useAuth()

    const [a, b] = await Promise.all([ensureLoaded(), ensureLoaded()])
    await ensureLoaded()

    expect(a).toEqual(ME)
    expect(b).toEqual(ME)
    expect(user.value?.email).toBe(ME.email)
    expect(isAuthenticated.value).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('un 401 significa "sin sesion", no un error', async () => {
    const fetch = mockApi({ 'GET /me': { status: 401 } })
    const { ensureLoaded, status } = useAuth()

    expect(await ensureLoaded()).toBeNull()
    expect(status.value).toBe('anonymous')
    // Ya se sabe que no hay sesion: no se vuelve a preguntar en cada navegacion.
    await ensureLoaded()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('otro error se propaga y permite reintentar', async () => {
    mockApi({ 'GET /me': { status: 500 } })
    const { ensureLoaded, status } = useAuth()

    await expect(ensureLoaded()).rejects.toThrow()
    expect(status.value).toBe('unknown')

    mockApi({ 'GET /me': { status: 200, body: ME } })
    expect(await ensureLoaded()).toEqual(ME)
  })

  it('logout cierra la sesion en el backend y limpia el estado', async () => {
    const fetch = mockApi({
      'GET /me': { status: 200, body: ME },
      'POST /auth/logout': { status: 204 },
    })
    const { ensureLoaded, logout, user, status } = useAuth()
    await ensureLoaded()

    await logout()

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(user.value).toBeNull()
    expect(status.value).toBe('anonymous')
  })

  it('logout limpia el estado aunque el backend falle', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME }, 'POST /auth/logout': { status: 500 } })
    const { ensureLoaded, logout, user } = useAuth()
    await ensureLoaded()

    await expect(logout()).rejects.toThrow()

    expect(user.value).toBeNull()
  })
})
