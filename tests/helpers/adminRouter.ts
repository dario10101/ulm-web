import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterLink, RouterView } from 'vue-router'

import { resetAuthState } from '../../src/composables/useAuth'
import { adminRoutes } from '../../src/router/routes/admin.routes'
import type { Me } from '../../src/types/user'
import { ME_ALL } from './fetchMock'

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

/**
 * Monta las rutas reales de /admin en `path`, con router en memoria, como un
 * usuario con todos los permisos (las paginas filtran sus tipos por permiso).
 */
export async function mountAdminRoute(path: string, navTo = 'admin-dashboard', me: Me = ME_ALL) {
  resetAuthState(me)
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
