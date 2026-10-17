import { API_BASE_URL } from '@/config/env'
import { deleteJson, getJson, patchJson, postForm, postJson, putJson } from '@/lib/http'
import type {
  AdminSection,
  BlogGroup,
  BlogItem,
  BlogSettings,
  BlogSettingsWrite,
  GroupWrite,
  ItemUpdate,
  SectionCreate,
  SectionUpdate,
} from '@/types/blogAdmin'

// Administracion del blog propio: un wrapper por endpoint de /blog/* (ulm-core
// app/api/routes/blog.py). Los errores llegan como ApiError con el mensaje del
// backend (422 trae el campo que fallo; 409, el slug repetido o el choque).

const section = (id: string) => `/blog/sections/${encodeURIComponent(id)}`

// --- Config ---

export function getBlogSettings(): Promise<BlogSettings> {
  return getJson<BlogSettings>('/blog/settings')
}

export function updateBlogSettings(payload: BlogSettingsWrite): Promise<BlogSettings> {
  return putJson<BlogSettings>('/blog/settings', payload)
}

// --- Secciones ---

export function listSections(): Promise<AdminSection[]> {
  return getJson<AdminSection[]>('/blog/sections')
}

export function createSection(payload: SectionCreate): Promise<AdminSection> {
  return postJson<AdminSection>('/blog/sections', payload)
}

export function updateSection(id: string, payload: SectionUpdate): Promise<AdminSection> {
  return patchJson<AdminSection>(section(id), payload)
}

export function setSectionContent(id: string, content: unknown): Promise<AdminSection> {
  return putJson<AdminSection>(`${section(id)}/content`, content)
}

/** Todas las secciones, en el orden nuevo del menu. */
export function reorderSections(ids: string[]): Promise<AdminSection[]> {
  return putJson<AdminSection[]>('/blog/sections/order', { ids })
}

export function deleteSection(id: string): Promise<void> {
  return deleteJson(section(id))
}

// --- Subsecciones ---

export function listGroups(sectionId: string): Promise<BlogGroup[]> {
  return getJson<BlogGroup[]>(`${section(sectionId)}/groups`)
}

export function createGroup(sectionId: string, payload: GroupWrite): Promise<BlogGroup> {
  return postJson<BlogGroup>(`${section(sectionId)}/groups`, payload)
}

export function updateGroup(
  sectionId: string,
  groupId: string,
  payload: GroupWrite,
): Promise<BlogGroup> {
  return patchJson<BlogGroup>(
    `${section(sectionId)}/groups/${encodeURIComponent(groupId)}`,
    payload,
  )
}

export function reorderGroups(sectionId: string, ids: string[]): Promise<BlogGroup[]> {
  return putJson<BlogGroup[]>(`${section(sectionId)}/groups/order`, { ids })
}

export function deleteGroup(sectionId: string, groupId: string): Promise<void> {
  return deleteJson(`${section(sectionId)}/groups/${encodeURIComponent(groupId)}`)
}

// --- Elementos (.md) ---

export function listItems(sectionId: string): Promise<BlogItem[]> {
  return getJson<BlogItem[]>(`${section(sectionId)}/items`)
}

/**
 * Sube un .md. Queda en borrador. Un slug que ya existe en la seccion es 409,
 * salvo `replace` (reemplaza metadatos y cuerpo, conserva estado y posicion).
 */
export function uploadItem(
  sectionId: string,
  file: File,
  options: { groupId?: string | null; replace?: boolean } = {},
): Promise<BlogItem> {
  const form = new FormData()
  form.append('file', file)
  if (options.groupId) form.append('group_id', options.groupId)
  const query = options.replace ? '?replace=true' : ''
  return postForm<BlogItem>(`${section(sectionId)}/items${query}`, form)
}

export function updateItem(
  sectionId: string,
  itemId: string,
  payload: ItemUpdate,
): Promise<BlogItem> {
  return patchJson<BlogItem>(`${section(sectionId)}/items/${encodeURIComponent(itemId)}`, payload)
}

/** Orden manual: todos los elementos de la seccion, en el orden nuevo. */
export function reorderItems(sectionId: string, ids: string[]): Promise<BlogItem[]> {
  return putJson<BlogItem[]>(`${section(sectionId)}/items/order`, { ids })
}

export function deleteItem(sectionId: string, itemId: string): Promise<void> {
  return deleteJson(`${section(sectionId)}/items/${encodeURIComponent(itemId)}`)
}

/**
 * URL del .md original, para un `<a href download>`: es un GET del mismo
 * origen, asi que la cookie de sesion viaja sola y no hace falta fetch.
 */
export function downloadItemUrl(sectionId: string, itemId: string): string {
  return `${API_BASE_URL}${section(sectionId)}/items/${encodeURIComponent(itemId)}/download`
}
