import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { domainSummary, setDomainAccess, setDomainAi } from '../src/lib/userPermissions'
import type { AdminUser } from '../src/types/adminUsers'
import { mountAdminRoute } from './helpers/adminRouter'
import { ME, ME_ALL, mockApi } from './helpers/fetchMock'

const ADMIN: AdminUser = {
  id: 1,
  name: 'Ruben Dorado',
  email: 'ruben.d21pc@gmail.com',
  avatar_url: null,
  status: 'active',
  is_admin: true,
  permissions: ME_ALL.permissions,
  created_at: '2026-09-01T00:00:00Z',
  last_login_at: '2026-10-03T12:00:00Z',
}

const ANA: AdminUser = {
  id: 2,
  name: 'Ana',
  email: 'ana@gmail.com',
  avatar_url: null,
  status: 'active',
  is_admin: false,
  permissions: ['finances', 'finances.ai', 'planning'],
  created_at: '2026-09-10T00:00:00Z',
  last_login_at: null,
}

describe('reglas de la matriz de permisos', () => {
  it('quitar el acceso quita tambien su AI', () => {
    expect(setDomainAccess(['finances', 'finances.ai', 'meals'], 'finances', false)).toEqual([
      'meals',
    ])
    expect(setDomainAccess([], 'weight', true)).toEqual(['weight'])
  })

  it('AI solo con el acceso del dominio', () => {
    expect(setDomainAi(['meals'], 'finances', true)).toEqual(['meals'])
    expect(setDomainAi(['finances'], 'finances', true)).toEqual(['finances', 'finances.ai'])
    expect(setDomainAi(['finances', 'finances.ai'], 'finances', false)).toEqual(['finances'])
  })

  it('resumen por dominio, en orden fijo', () => {
    expect(domainSummary(['planning', 'finances.ai', 'finances'])).toBe('Finances (AI) · Planning')
    expect(domainSummary([])).toBe('')
  })
})

describe('Settings -> Users', () => {
  async function mountUsers(replies = {}) {
    const fetchMock = mockApi({
      'GET /admin/users': { status: 200, body: [ADMIN, ANA] },
      ...replies,
    })
    const mounted = await mountAdminRoute('/admin/settings/users', 'admin-settings', ME_ALL)
    return { ...mounted, fetchMock }
  }

  it('solo el admin ve la seccion: otro usuario vuelve a General', async () => {
    mockApi({})
    const { wrapper, router } = await mountAdminRoute('/admin/settings/users', 'admin-settings', ME)

    expect(router.currentRoute.value.params.section).toBe('general')
    expect(wrapper.text()).not.toContain('Invite user')
  })

  it('lista con estado y modulos; el admin no tiene acciones', async () => {
    const { wrapper } = await mountUsers()

    const admin = wrapper.get('[data-test="user-row-1"]')
    expect(admin.text()).toContain('Admin')
    expect(admin.text()).toContain('All access')
    expect(admin.findAll('button')).toHaveLength(0)

    const ana = wrapper.get('[data-test="user-row-2"]')
    expect(ana.get('[data-test="access"]').text()).toBe('Finances (AI) · Planning')
    expect(ana.text()).toContain('Never signed in')
    expect(ana.find('[title="Disable Ana"]').exists()).toBe(true)
  })

  it('editar permisos manda el conjunto completo y respeta la regla del AI', async () => {
    const { wrapper, fetchMock } = await mountUsers({
      'PUT /admin/users/2/permissions': {
        status: 200,
        body: { ...ANA, permissions: ['planning', 'weight'] },
      },
    })

    await wrapper.get('[title="Edit permissions of Ana"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    const financesAi = dialog.get('[aria-label="Finances AI"]')
    expect((financesAi.element as HTMLInputElement).checked).toBe(true)

    // Quitar el acceso a finanzas apaga y deshabilita su AI.
    await dialog.get('[aria-label="Finances access"]').setValue(false)
    expect((financesAi.element as HTMLInputElement).checked).toBe(false)
    expect((financesAi.element as HTMLInputElement).disabled).toBe(true)
    await dialog.get('[aria-label="Weight access"]').setValue(true)
    await dialog.trigger('submit')
    await flushPromises()

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(JSON.parse(put[1]!.body as string).permissions.sort()).toEqual(['planning', 'weight'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="user-row-2"] [data-test="access"]').text()).toBe(
      'Weight · Planning',
    )
  })

  it('un error del backend se muestra en el dialogo', async () => {
    const { wrapper } = await mountUsers({
      'PUT /admin/users/2/permissions': {
        status: 422,
        body: { detail: 'finances.ai exige tener antes finances' },
      },
    })

    await wrapper.get('[title="Edit permissions of Ana"]').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('exige tener antes')
  })

  it('invitar agrega la fila y abre sus permisos', async () => {
    const NEW: AdminUser = {
      ...ANA,
      id: 3,
      name: 'nuevo',
      email: 'nuevo@gmail.com',
      status: 'invited',
      permissions: [],
    }
    const { wrapper, fetchMock } = await mountUsers({
      'POST /admin/users': { status: 201, body: NEW },
    })

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Invite user')!
      .trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    await dialog.get('input[type="email"]').setValue('nuevo@gmail.com')
    await dialog.trigger('submit')
    await flushPromises()

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]!.body as string)).toEqual({ email: 'nuevo@gmail.com', name: null })
    expect(wrapper.get('[data-test="user-row-3"]').text()).toContain('Invited')
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Permissions of nuevo')
  })

  it('deshabilitar pide confirmacion', async () => {
    const { wrapper, fetchMock } = await mountUsers({
      'POST /admin/users/2/disable': { status: 200, body: { ...ANA, status: 'disabled' } },
    })

    await wrapper.get('[title="Disable Ana"]').trigger('click')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)

    const confirm = wrapper.get('[role="alertdialog"]')
    await confirm.findAll('button').at(-1)!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="user-row-2"]').text()).toContain('Disabled')
    expect(wrapper.find('[title="Enable Ana"]').exists()).toBe(true)
  })
})
