import { getJson } from '@/lib/http'
import type { PublicBlog, PublicCollection, PublicItem } from '@/types/blog'

/**
 * Blog publico, sin sesion. Cualquier cosa que no se pueda ver (usuario
 * inexistente o sin permiso, blog o seccion deshabilitados, borradores)
 * responde el mismo 404. `skipUnauthorizedHandler` por si acaso: el sitio
 * publico nunca debe mandar al login.
 */
const PUBLIC = { skipUnauthorizedHandler: true }

const path = (...parts: string[]) => parts.map(encodeURIComponent).join('/')

/** Dueño + secciones habilitadas con su contenido (todo el menu en un request). */
export function getPublicBlog(username: string): Promise<PublicBlog> {
  return getJson<PublicBlog>(`/public/blogs/${path(username)}`, PUBLIC)
}

/** Subsecciones y elementos publicados de una coleccion, sin cuerpos. */
export function getPublicCollection(username: string, section: string): Promise<PublicCollection> {
  return getJson<PublicCollection>(`/public/blogs/${path(username, section)}/items`, PUBLIC)
}

export function getPublicItem(
  username: string,
  section: string,
  item: string,
): Promise<PublicItem> {
  return getJson<PublicItem>(`/public/blogs/${path(username, section)}/items/${path(item)}`, PUBLIC)
}
