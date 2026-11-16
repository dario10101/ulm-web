// Administracion del blog propio (/blog/*, permiso `blog`), tal como lo
// devuelve ulm-core (app/schemas/blog_admin.py). A diferencia del publico, ve
// ids, borradores y secciones deshabilitadas.

export interface BlogSectionType {
  type: string
  singleton: boolean
  has_items: boolean
  default_label: string
  default_slug: string | null
}

/** Un tipo del catalogo de links (ulm-core app/services/blog_links.py). */
export interface BlogLinkType {
  type: string
  label: string
  category: string
  kind: 'url' | 'email' | 'phone'
  domains: string[]
  requires_label: boolean
  // Expone un dato personal: el formulario avisa.
  sensitive: boolean
  placeholder: string
}

export interface BlogSettings {
  enabled: boolean
  display_name: string | null
  max_enabled_sections: number
  max_sections: number
  section_types: BlogSectionType[]
  link_types: BlogLinkType[]
  link_categories: string[]
  max_links_per_type: number
}

export interface AdminLink {
  id: string
  type: string
  // Normalizado: https://..., mailto:... o https://wa.me/...
  url: string
  label: string | null
  // Secciones donde esta habilitado.
  used_in: number
}

export interface LinkWrite {
  type: string
  url: string
  label: string | null
}

export interface LinkSlot {
  id: string
  enabled: boolean
}

/** Por ubicacion, en orden; trae todos los links (los nunca ubicados, al
 * final y deshabilitados). */
export interface SectionLinks {
  inline: LinkSlot[]
  end: LinkSlot[]
}

export interface BlogSettingsWrite {
  enabled: boolean
  display_name: string | null
}

export interface AdminSection {
  id: string
  type: string
  label: string
  slug: string
  position: number
  enabled: boolean
  // Forma segun el tipo: HomeContent, AboutContent... (src/types/blog.ts).
  content: Record<string, unknown>
  links: SectionLinks
  created_at: string
  updated_at: string
}

export interface SectionCreate {
  type: string
  label?: string | null
  slug?: string | null
  enabled?: boolean
}

export interface SectionUpdate {
  label?: string
  slug?: string
  enabled?: boolean
}

export interface BlogGroup {
  id: string
  label: string
  description: string | null
  position: number
}

export interface GroupWrite {
  label: string
  description: string | null
}

export type ItemStatus = 'draft' | 'published'

export interface BlogItem {
  id: string
  section_id: string
  slug: string
  title: string
  date: string | null
  excerpt: string | null
  tags: string[]
  cover_url: string | null
  group_id: string | null
  status: ItemStatus
  position: number | null
  size_bytes: number
  original_filename: string
  created_at: string
  updated_at: string
}

export interface ItemUpdate {
  status?: ItemStatus
  // null: lo saca de su subseccion.
  group_id?: string | null
  position?: number | null
}
