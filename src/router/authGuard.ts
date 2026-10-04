import type { Router } from 'vue-router'

import { useAuth } from '@/composables/useAuth'
import { setUnauthorizedHandler } from '@/lib/http'
import { safeAdminPath } from '@/lib/redirect'

/**
 * Engancha el login al router:
 *
 * - Rutas con `meta.requiresAuth` (todo /admin): sin sesion, a /login con
 *   `redirect` para volver despues a la misma pagina.
 * - Rutas con `meta.permission` sin ese permiso: a admin-no-access.
 * - /login con sesion activa: directo a donde iba (o al dashboard).
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
    const isLogin = to.name === 'auth-login'
    if (!requiresAuth && !isLogin) return true

    let me
    try {
      me = await ensureLoaded()
    } catch {
      // No se pudo saber si hay sesion (API caida): se deja pasar y cada
      // pagina muestra su propio error de carga, que es lo que realmente pasa.
      return true
    }

    if (requiresAuth && !me) {
      return { name: 'auth-login', query: { redirect: to.fullPath } }
    }
    if (requiresAuth && !can(to.meta.permission)) {
      return { name: 'admin-no-access' }
    }
    if (isLogin && me) {
      return safeAdminPath(to.query.redirect) ?? { name: 'admin-dashboard' }
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
