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

export interface BlogSettings {
  enabled: boolean
  display_name: string | null
  max_enabled_sections: number
  max_sections: number
  section_types: BlogSectionType[]
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
