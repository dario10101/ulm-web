import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import UsernameCard from '../src/components/account/UsernameCard.vue'
import { resetAuthState, useAuth } from '../src/composables/useAuth'
import { normalizeUsername, usernameFormatError } from '../src/lib/username'
import { adminRoutes } from '../src/router/routes/admin.routes'
import type { Me } from '../src/types/user'
import { ME, ME_ALL, mockApi } from './helpers/fetchMock'

describe('formato del username', () => {
  it('normaliza a minusculas y sin espacios', () => {
    expect(normalizeUsername('  Ruben-D ')).toBe('ruben-d')
  })

  it.each(['ruben', 'ruben-d21', 'abc', 'Ruben'])('acepta %s', (value) => {
    expect(usernameFormatError(value)).toBeNull()
  })

  it.each(['ab', 'a'.repeat(31), '-ruben', 'ruben-', 'ru--ben', 'ru_ben', 'rubén', 'ru ben'])(
    'rechaza %s',
    (value) => {
      expect(usernameFormatError(value)).not.toBeNull()
    },
  )
})

describe('UsernameCard', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/blog/:username', name: 'blog-home', component: { template: '<div />' } }],
  })

  function mountCard() {
    return mount(UsernameCard, { global: { plugins: [router] } })
  }

  beforeEach(() => resetAuthState(ME))

  it('explica que el username sera la URL del blog', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('Ruben-D')

    expect(wrapper.find('[data-test="username-hint"]').text()).toContain('/blog/ruben-d')
  })

  it('no deja enviar un formato invalido', async () => {
    const wrapper = mountCard()
    await wrapper.find('input').setValue('-mal')

    expect(wrapper.text()).toContain('Only lowercase letters')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('al crearlo actualiza el usuario y lo muestra como fijo', async () => {
    const fetch = mockApi({
      'PUT /me/username': { status: 200, body: { ...ME, username: 'ruben' } },
    })
    const wrapper = mountCard()

    await wrapper.find('input').setValue('Ruben')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ username: 'ruben' })
    expect(useAuth().user.value?.username).toBe('ruben')
    expect(wrapper.find('input').attributes('readonly')).toBeDefined()
    expect(wrapper.text()).toContain("can't be changed")
  })

  it('muestra el error del backend (ej. ya esta en uso)', async () => {
    mockApi({
      'PUT /me/username': { status: 409, body: { detail: "El username 'ruben' ya esta en uso" } },
    })
    const wrapper = mountCard()

    await wrapper.find('input').setValue('ruben')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('ya esta en uso')
    expect(useAuth().user.value?.username).toBeNull()
  })
})

describe('BlogAdminPage', () => {
  // Las rutas reales de /admin mas el blog publico, al que enlaza la pagina.
  async function mountBlogAdmin(me: Me) {
    resetAuthState(me)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', children: adminRoutes },
        { path: '/blog/:username', name: 'blog-home', component: { template: '<div />' } },
      ],
    })
    router.push('/admin/blog')
    await router.isReady()
    const wrapper = mount(RouterView, { global: { plugins: [router] } })
    await flushPromises()
    return wrapper
  }

  it('sin username pide crearlo primero', async () => {
    const wrapper = await mountBlogAdmin(ME_ALL)

    expect(wrapper.text()).toContain('Create your username first')
    expect(wrapper.find('a[href="/admin/settings/general"]').exists()).toBe(true)
  })

  it('con username entra al modulo', async () => {
    const wrapper = await mountBlogAdmin({ ...ME_ALL, username: 'ruben' })

    expect(wrapper.text()).not.toContain('Create your username first')
    expect(wrapper.find('a[href="/blog/ruben"]').exists()).toBe(true)
  })
})
