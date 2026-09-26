import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterLink, RouterView } from 'vue-router'

import { adminRoutes } from '../../src/router/routes/admin.routes'

// Shell minimo: un link del sidebar (para verificar el estado activo) + la vista.
function makeShell(navTo: string) {
  return defineComponent(() => () => [
    h(
      RouterLink,
      { to: { name: navTo }, activeClass: 'is-active', 'data-test': 'nav' },
      () => 'nav',
    ),
    h(RouterView),
  ])
}

/** Monta las rutas reales de /admin en `path`, con router en memoria. */
export async function mountAdminRoute(path: string, navTo = 'admin-dashboard') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', children: adminRoutes }],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(makeShell(navTo), { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}
