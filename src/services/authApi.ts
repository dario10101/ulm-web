import { API_BASE_URL } from '@/config/env'
import { getJson, postJson, putJson } from '@/lib/http'
import type { Me } from '@/types/user'

/**
 * Usuario de la sesion actual. Sin sesion responde 401: es la forma normal de
 * preguntar "¿hay alguien logueado?", asi que no dispara la redireccion global
 * al login (ver `setUnauthorizedHandler` en lib/http).
 */
export function getMe(): Promise<Me> {
  return getJson<Me>('/me', { skipUnauthorizedHandler: true })
}

/** Crea el username (una sola vez: el backend responde 409 si ya hay uno). */
export function setUsername(username: string): Promise<Me> {
  return putJson<Me>('/me/username', { username })
}

export function logout(): Promise<void> {
  return postJson<void>('/auth/logout', {})
}

/**
 * URL que arranca el login con Google. Es una navegacion completa, no un
 * fetch: el backend redirige a Google y Google vuelve al backend, que deja la
 * cookie y redirige a `next`. La zona del navegador solo se usa en el primer
 * login del usuario.
 */
export function googleLoginUrl(next?: string): string {
  const query = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  if (next) query.set('next', next)
  return `${API_BASE_URL}/auth/google/login?${query.toString()}`
}
