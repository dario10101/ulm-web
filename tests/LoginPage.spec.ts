import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { resetAuthState } from '../src/composables/useAuth'
import LoginPage from '../src/views/auth/LoginPage.vue'
import { ME, mockApi } from './helpers/fetchMock'

const Empty = defineComponent({ render: () => null })

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'auth-login', component: LoginPage },
      { path: '/admin/dashboard', name: 'admin-dashboard', component: Empty },
      { path: '/admin/records/:type?', name: 'admin-records', component: Empty },
    ],
  })
  await router.push(path)
  const wrapper = mount(LoginPage, { global: { plugins: [router] } })
  await flushPromises()
  return Object.assign(wrapper, { router })
}

/** Hace click en el boton y devuelve la URL a la que navegaria el navegador. */
function clickSignIn(wrapper: VueWrapper): URL {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  wrapper.find('button').trigger('click')
  return new URL(assign.mock.calls[0][0], 'http://localhost:5173')
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetAuthState()
    mockApi({ 'GET /me': { status: 401 } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['not_invited', "doesn't have access"],
    ['session_expired', 'session has expired'],
    ['algo_raro', 'failed'],
  ])('muestra el mensaje del error %s', async (code, text) => {
    const wrapper = await mountAt(`/login?error=${code}`)

    expect(wrapper.find('[role="alert"]').text()).toContain(text)
  })

  it('sin error no muestra mensaje', async () => {
    const wrapper = await mountAt('/login')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('arranca el login con Google mandando la zona y la pagina a la que volver', async () => {
    const url = clickSignIn(await mountAt('/login?redirect=/admin/records/weight'))

    expect(url.pathname).toBe('/api/v1/auth/google/login')
    expect(url.searchParams.get('next')).toBe('/admin/records/weight')
    expect(url.searchParams.get('tz')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('no reenvia un redirect fuera de /admin', async () => {
    const url = clickSignIn(await mountAt('/login?redirect=https://evil.example'))

    expect(url.searchParams.has('next')).toBe(false)
  })

  it('se muestra sin esperar a /me', async () => {
    // /me nunca responde (arranque en frio): el boton ya esta.
    global.fetch = (() => new Promise(() => {})) as typeof fetch

    const wrapper = await mountAt('/login')

    expect(wrapper.find('button').text()).toContain('Continue with Google')
  })

  it('con sesion activa va directo a la pagina pedida', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const { router } = await mountAt('/login?redirect=/admin/records/meal')

    expect(router.currentRoute.value.fullPath).toBe('/admin/records/meal')
  })

  it('con sesion y un redirect fuera de /admin va al dashboard', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const { router } = await mountAt('/login?redirect=https://evil.example')

    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('si la API no responde se queda en el login', async () => {
    global.fetch = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch

    const { router } = await mountAt('/login')

    expect(router.currentRoute.value.name).toBe('auth-login')
  })
})
