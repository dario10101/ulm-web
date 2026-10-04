import { getJson } from '@/lib/http'
import type { PublicBlog } from '@/types/blog'

/**
 * Blog publico de `username`. Sin sesion: responde 404 si no existe, esta
 * deshabilitado o el dueño no tiene el permiso `blog` (para el visitante es lo
 * mismo). `skipUnauthorizedHandler` por si acaso: nunca debe mandar al login.
 */
export function getPublicBlog(username: string): Promise<PublicBlog> {
  return getJson<PublicBlog>(`/public/blogs/${encodeURIComponent(username)}`, {
    skipUnauthorizedHandler: true,
  })
}
