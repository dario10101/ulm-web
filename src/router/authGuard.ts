import type { Router } from 'vue-router'

import { useAuth } from '@/composables/useAuth'
import { setUnauthorizedHandler } from '@/lib/http'

/**
 * Engancha el login al router:
 *
 * - Rutas con `meta.requiresAuth` (todo /admin): sin sesion, a /login con
 *   `redirect` para volver despues a la misma pagina.
 * - Rutas con `meta.permission` sin ese permiso: a admin-no-access.
 * - /login no espera a /me: se muestra al instante y la propia pagina
 *   redirige si resulta que hay sesion (views/auth/LoginPage.vue).
 * - Un 401 de la API en medio del uso (la sesion vencio): a /login con
 *   `error=session_expired`.
 *
 * La seguridad real esta en el backend, que responde 401 a todo lo privado:
 * esto solo evita mostrar pantallas que no van a poder cargar nada.
 */
export function installAuthGuard(router: Router): void {
  const { ensureLoaded, markSessionExpired, can } = useAuth()

  router.beforeEach(async (to) => {
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    if (!requiresAuth) return true

    let me
    try {
      me = await ensureLoaded()
    } catch {
      // No se pudo saber si hay sesion (API caida): se deja pasar y cada
      // pagina muestra su propio error de carga, que es lo que realmente pasa.
      return true
    }

    if (!me) {
      return { name: 'auth-login', query: { redirect: to.fullPath } }
    }
    if (!can(to.meta.permission)) {
      return { name: 'admin-no-access' }
    }
    return true
  })

  setUnauthorizedHandler(() => {
    markSessionExpired()
    const current = router.currentRoute.value
    if (current.name === 'auth-login') return
    router.push({
      name: 'auth-login',
      query: { redirect: current.fullPath, error: 'session_expired' },
    })
  })
}
