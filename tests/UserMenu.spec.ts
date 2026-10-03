import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import UserMenu from '../src/components/layout/UserMenu.vue'
import { resetAuthState } from '../src/composables/useAuth'
import { ME, mockApi } from './helpers/fetchMock'

const Empty = defineComponent({ render: () => null })

async function mountMenu() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/settings', name: 'admin-settings', component: Empty },
      { path: '/login', name: 'auth-login', component: Empty },
    ],
  })
  await router.push('/admin/settings')
  const wrapper = mount(UserMenu, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function logOutButton(wrapper: Awaited<ReturnType<typeof mountMenu>>['wrapper']) {
  return wrapper.findAll('button').find((b) => b.text() === 'Log out')!
}

describe('UserMenu', () => {
  beforeEach(() => resetAuthState())

  it('muestra el usuario de la sesion, no uno fijo', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME } })

    const { wrapper } = await mountMenu()

    expect(wrapper.text()).toContain('Ruben Dorado')
    expect(wrapper.text()).toContain('ruben.d21pc@gmail.com')
    const avatar = wrapper.find('img')
    expect(avatar.attributes('src')).toBe(ME.avatar_url)
    expect(avatar.attributes('referrerpolicy')).toBe('no-referrer')
  })

  it('sin foto muestra la inicial', async () => {
    mockApi({ 'GET /me': { status: 200, body: { ...ME, avatar_url: null } } })

    const { wrapper } = await mountMenu()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('summary').text()).toContain('R')
  })

  it('logout cierra la sesion en el backend y va al login', async () => {
    const fetch = mockApi({
      'GET /me': { status: 200, body: ME },
      'POST /auth/logout': { status: 204 },
    })
    const { wrapper, router } = await mountMenu()

    await logOutButton(wrapper).trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(router.currentRoute.value.name).toBe('auth-login')
    expect(wrapper.text()).toContain('Sign in')
  })

  it('va al login aunque el logout del backend falle', async () => {
    mockApi({ 'GET /me': { status: 200, body: ME }, 'POST /auth/logout': { status: 500 } })
    const { wrapper, router } = await mountMenu()

    await logOutButton(wrapper).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('auth-login')
  })

  it('sin sesion ofrece iniciar sesion', async () => {
    mockApi({ 'GET /me': { status: 401 } })

    const { wrapper } = await mountMenu()

    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sign in')
  })
})
