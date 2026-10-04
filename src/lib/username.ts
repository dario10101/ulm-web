/**
 * Formato del username, el mismo que valida ulm-core (app/services/username.py).
 * Aca solo para avisar mientras se escribe: los nombres reservados y la
 * unicidad los decide el backend (422 / 409).
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

const USERNAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** El motivo por el que `value` no sirve, o null si el formato es valido. */
export function usernameFormatError(value: string): string | null {
  const username = normalizeUsername(value)
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`
  }
  if (!USERNAME_RE.test(username)) {
    return 'Only lowercase letters, numbers and single hyphens (not at the start or end).'
  }
  return null
}
