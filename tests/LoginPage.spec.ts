import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import LoginPage from '../src/views/auth/LoginPage.vue'

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', name: 'auth-login', component: LoginPage }],
  })
  await router.push(path)
  const wrapper = mount(LoginPage, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

/** Hace click en el boton y devuelve la URL a la que navegaria el navegador. */
function clickSignIn(wrapper: VueWrapper): URL {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  wrapper.find('button').trigger('click')
  return new URL(assign.mock.calls[0][0], 'http://localhost:5173')
}

describe('LoginPage', () => {
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
})
