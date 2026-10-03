/**
 * `value` si es una ruta del area privada (/admin...), o null.
 *
 * El `redirect` de /login viene de la URL, y cualquiera puede armar un link
 * con uno: aceptar cualquier valor convertiria el login en un open redirect.
 * Mismo criterio que el backend (ulm-core auth_service.safe_next_path).
 */
export function safeAdminPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value !== '/admin' && !value.startsWith('/admin/') && !value.startsWith('/admin?')) {
    return null
  }
  if (value.includes('//') || value.includes('\\')) return null
  return value
}
