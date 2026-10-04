import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import SidebarNav from '../src/components/layout/SidebarNav.vue'
import { resetAuthState, useAuth } from '../src/composables/useAuth'
import type { Permission } from '../src/config/permissions'
import { setUnauthorizedHandler } from '../src/lib/http'
import { installAuthGuard } from '../src/router/authGuard'
import { adminRoutes } from '../src/router/routes/admin.routes'
import { mountAdminRoute } from './helpers/adminRouter'
import { ME, mockApi } from './helpers/fetchMock'

const withPermissions = (...permissions: Permission[]) => ({ ...ME, permissions })

function okForEverything() {
  global.fetch = (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })) as unknown as typeof fetch
}

describe('can', () => {
  beforeEach(() => resetAuthState())

  it('sin requisito, si; sin usuario, nada mas', () => {
    const { can } = useAuth()

    expect(can()).toBe(true)
    expect(can('weight')).toBe(false)
  })

  it('un permiso o una lista (cualquiera de)', () => {
    resetAuthState(withPermissions('weight'))
    const { can } = useAuth()

    expect(can('weight')).toBe(true)
    expect(can('finances')).toBe(false)
    expect(can(['finances', 'weight'])).toBe(true)
    expect(can(['finances', 'planning'])).toBe(false)
  })
})

describe('guard de permisos', () => {
  async function routerAt(path: string, ...permissions: Permission[]) {
    resetAuthState()
    setUnauthorizedHandler(null)
    mockApi({ 'GET /me': { status: 200, body: withPermissions(...permissions) } })
    const router = createRouter({
      history: createMemoryHistory(),
      // Las rutas reales de /admin: asi el test cubre su meta.permission.
      routes: [
        { path: '/admin', meta: { requiresAuth: true }, children: adminRoutes },
        { path: '/login', name: 'auth-login', component: defineComponent({ render: () => null }) },
      ],
    })
    installAuthGuard(router)
    await router.push(path)
    return router
  }

  it.each([
    ['/admin/checklists', 'planning'],
    ['/admin/calendar/week', 'planning'],
    ['/admin/checklists/categories', 'planning'],
    ['/admin/analytics/finance', 'finances'],
    ['/admin/analytics/weight', 'weight'],
    ['/admin/analytics/checklists', 'planning'],
  ] as [string, Permission][])('%s exige %s', async (path, permission) => {
    expect((await routerAt(path)).currentRoute.value.name).toBe('admin-no-access')
    expect((await routerAt(path, permission)).currentRoute.value.path).toBe(path)
  })

  it('records y quick-add se abren con cualquier modulo de registros', async () => {
    expect((await routerAt('/admin/records')).currentRoute.value.name).toBe('admin-no-access')
    expect((await routerAt('/admin/quick-add', 'meals')).currentRoute.value.name).toBe(
      'admin-quick-add',
    )
  })

  it('las paginas sin modulo no piden permiso', async () => {
    expect((await routerAt('/admin/settings')).currentRoute.value.name).toBe('admin-settings')
    expect((await routerAt('/admin/dashboard')).currentRoute.value.name).toBe('admin-dashboard')
  })
})

describe('menu lateral', () => {
  async function navLabels(...permissions: Permission[]) {
    resetAuthState(withPermissions(...permissions))
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    router.addRoute({ path: '/admin', children: adminRoutes })
    await router.push('/admin/settings')
    const wrapper = mount(SidebarNav, { global: { plugins: [router] } })
    await flushPromises()
    return wrapper.findAll('nav a').map((link) => link.text())
  }

  it('sin permisos solo muestra lo que no es de un modulo', async () => {
    const labels = await navLabels()

    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Settings')
    expect(labels).not.toContain('Calendar')
    expect(labels).not.toContain('Add record')
    expect(labels).not.toContain('Analytics')
  })

  it('cada permiso suma sus items', async () => {
    const labels = await navLabels('planning')

    expect(labels).toContain("Today's checklist")
    expect(labels).toContain('Calendar')
    // Task es un tipo de registro de planning: "Add record" tambien aparece.
    expect(labels).toContain('Add record')
    expect(labels).toContain('Analytics')
  })
})

describe('pantallas con tipos', () => {
  beforeEach(okForEverything)

  function typeButtons(wrapper: Awaited<ReturnType<typeof mountAdminRoute>>['wrapper']) {
    return wrapper.findAll('button').map((button) => button.text())
  }

  it('quick-add muestra solo los tipos de los modulos del usuario', async () => {
    const { wrapper } = await mountAdminRoute(
      '/admin/quick-add',
      'admin-quick-add',
      withPermissions('weight'),
    )

    const labels = typeButtons(wrapper)
    expect(labels).toContain('Weight')
    expect(labels).not.toContain('Expense')
    expect(labels).not.toContain('Meal')
    // Los no implementados se ven deshabilitados para todos.
    expect(labels).toContain('Workout')
  })

  it('quick-add de un tipo sin permiso vuelve al menu', async () => {
    const { router } = await mountAdminRoute(
      '/admin/quick-add/expense',
      'admin-quick-add',
      withPermissions('weight'),
    )

    expect(router.currentRoute.value.fullPath).toBe('/admin/quick-add')
  })

  it('records sin el tipo por defecto (weight) abre el primero visible', async () => {
    const { router } = await mountAdminRoute(
      '/admin/records',
      'admin-records',
      withPermissions('meals'),
    )

    expect(router.currentRoute.value.fullPath).toBe('/admin/records/meal')
  })

  it('analytics muestra solo los analisis de sus modulos', async () => {
    const { wrapper } = await mountAdminRoute(
      '/admin/analytics',
      'admin-analytics',
      withPermissions('finances'),
    )

    expect(wrapper.text()).toContain('Finance analysis')
    expect(wrapper.text()).not.toContain('Weight trend')
    expect(wrapper.text()).not.toContain('Checklist trends')
  })
})
