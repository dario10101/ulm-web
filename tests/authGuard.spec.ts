import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { resetAuthState, useAuth } from '../src/composables/useAuth'
import { getJson, setUnauthorizedHandler } from '../src/lib/http'
import { installAuthGuard } from '../src/router/authGuard'
import { ME, mockApi } from './helpers/fetchMock'

const Empty = defineComponent({ render: () => null })

async function routerAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin',
        meta: { requiresAuth: true },
        children: [
          { path: 'dashboard', name: 'admin-dashboard', component: Empty },
          { path: 'records/:type?', name: 'admin-records', component: Empty },
        ],
      },
      { path: '/login', name: 'auth-login', component: Empty },
      { path: '/blog', name: 'public-home', component: Empty },
    ],
  })
  installAuthGuard(router)
  await router.push(path)
  return router
}

describe('authGuard', () => {
  beforeEach(() => {
    resetAuthState()
    setUnauthorizedHandler(null)
  })

  it('sin sesion manda a /login recordando la pagina pedida', async () => {
    mockApi({ 'GET /me': { status: 401 } })

    const router = await routerAt('/admin/records/weight?page=2')

    expect(router.currentRoute.value.name).toBe('auth-login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/records/weight?page=2')
  })

  it('preguntar por la sesion en una pagina publica no saca al visitante de ahi', async () => {
    // El UserMenu del blog llama a /me; sin sesion responde 401, que es la
    // respuesta normal y no debe disparar el handler global de "sesion vencida".
    mockApi({ 'GET /me': { status: 401 } })
    const router = await routerAt('/blog')

    await useAuth().ensureLoaded()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('public-home')
  })

  it('con sesion deja entrar a /admin', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const router = await routerAt('/admin/dashboard')

    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('las paginas publicas no preguntan por la sesion', async () => {
    const fetch = mockApi({})

    const router = await routerAt('/blog')

    expect(router.currentRoute.value.name).toBe('public-home')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('/login con sesion activa va directo a la pagina pedida', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const router = await routerAt('/login?redirect=/admin/records/meal')

    expect(router.currentRoute.value.fullPath).toBe('/admin/records/meal')
  })

  it('un redirect fuera de /admin se ignora', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const router = await routerAt('/login?redirect=https://evil.example')

    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('si la API no responde deja pasar (la pagina muestra su error)', async () => {
    global.fetch = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch

    const router = await routerAt('/admin/dashboard')

    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('un 401 en medio del uso manda a /login con session_expired', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME }, 'GET /weights/': { status: 401 } })
    const router = await routerAt('/admin/records/weight')

    await getJson('/weights/').catch(() => {})
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('auth-login')
    expect(router.currentRoute.value.query).toEqual({
      redirect: '/admin/records/weight',
      error: 'session_expired',
    })
  })
})
