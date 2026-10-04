import { computed, ref } from 'vue'

import type { PermissionRequirement } from '@/config/permissions'
import { ApiError } from '@/lib/http'
import { getMe, logout as logoutRequest } from '@/services/authApi'
import type { Me } from '@/types/user'

/**
 * Usuario logueado, compartido por toda la app (estado fuera de la funcion,
 * mismo patron que `useCategories`).
 *
 * `status` distingue "todavia no se pregunto" (unknown) de "se pregunto y no
 * hay sesion" (anonymous): el guard del router solo llama a /me en el primer
 * caso, asi que navegar entre paginas no repite la peticion.
 */
type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

const user = ref<Me | null>(null)
const status = ref<AuthStatus>('unknown')
let inFlight: Promise<Me | null> | null = null

function setAnonymous(): void {
  user.value = null
  status.value = 'anonymous'
}

/**
 * Vuelve al estado inicial, o deja a `me` como usuario logueado sin pasar por
 * la API. Para los tests.
 */
export function resetAuthState(me: Me | null = null): void {
  user.value = me
  status.value = me ? 'authenticated' : 'unknown'
  inFlight = null
}

/**
 * ¿El usuario cumple `requirement`? Sin requisito, si. Una lista es "cualquiera
 * de". Solo para mostrar u ocultar: el backend responde 403 igual.
 */
function can(requirement?: PermissionRequirement): boolean {
  if (requirement === undefined) return true
  const granted = user.value?.permissions ?? []
  const required = typeof requirement === 'string' ? [requirement] : requirement
  return required.some((permission) => granted.includes(permission))
}

export function useAuth() {
  /**
   * El usuario de la sesion, o null si no hay. Un error que no sea 401 (API
   * caida, 500) se propaga y deja el estado en `unknown`, para reintentar en la
   * proxima navegacion: no es lo mismo "no hay sesion" que "no se pudo saber".
   */
  async function ensureLoaded(): Promise<Me | null> {
    if (status.value !== 'unknown') return user.value
    if (inFlight) return inFlight

    inFlight = getMe()
      .then((me) => {
        user.value = me
        status.value = 'authenticated'
        return me
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setAnonymous()
          return null
        }
        throw error
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  /**
   * Cierra la sesion en el backend. El estado local se limpia aunque la
   * peticion falle: el usuario pidio salir, y una cookie que quedara viva en el
   * servidor vence sola.
   */
  async function logout(): Promise<void> {
    try {
      await logoutRequest()
    } finally {
      setAnonymous()
    }
  }

  return {
    user,
    status,
    isAuthenticated: computed(() => status.value === 'authenticated'),
    isAdmin: computed(() => user.value?.is_admin ?? false),
    can,
    ensureLoaded,
    logout,
    /** La API respondio 401 en medio del uso: la sesion ya no existe. */
    markSessionExpired: setAnonymous,
  }
}
