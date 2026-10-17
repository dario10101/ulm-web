// Blog publico (ulm-core app/schemas/blog.py). Solo datos publicos: sin ids
// internos ni datos de la cuenta; se navega por slugs.

export interface PublicSection<C = Record<string, unknown>> {
  slug: string
  label: string
  // Tipo del catalogo (ulm-core app/services/blog_section_types.py).
  type: string
  content: C
}

export interface PublicBlog {
  username: string
  display_name: string | null
  // Solo las habilitadas, en el orden del menu.
  sections: PublicSection[]
}

export interface PublicItemSummary {
  slug: string
  title: string
  date: string | null
  excerpt: string | null
  tags: string[]
  cover_url: string | null
}

export interface PublicSectionRef {
  slug: string
  label: string
}

export interface PublicCollection {
  section: PublicSectionRef
  groups: { label: string; description: string | null; items: PublicItemSummary[] }[]
  ungrouped: PublicItemSummary[]
}

export interface PublicItem extends PublicItemSummary {
  section: PublicSectionRef
  // Markdown sin frontmatter; se pinta con MarkdownContent.
  body_md: string
}

// --- Contenido de cada plantilla (mismos campos que los modelos Pydantic) ---

export interface BlogLink {
  label: string
  url: string
}

export interface HomeContent {
  headline: string
  intro: string
  highlights: {
    kind: 'project' | 'product' | 'link'
    title: string
    description: string
    image_url: string | null
    url: string | null
  }[]
  cta: BlogLink | null
}

export interface AboutContent {
  photo_url: string | null
  bio: string
  interests: string[]
  links: BlogLink[]
}

export interface ProfessionalContent {
  headline: string
  summary: string
  experience: {
    company: string
    role: string
    start: string
    end: string | null
    description: string
  }[]
  education: {
    institution: string
    degree: string
    start: string | null
    end: string | null
    description: string
  }[]
  skills: string[]
  certifications: { name: string; issuer: string; year: number | null; url: string | null }[]
  links: BlogLink[]
}

export interface CollectionContent {
  intro: string
  layout: 'list' | 'cards'
  sort: 'date_desc' | 'manual' | 'title'
}
