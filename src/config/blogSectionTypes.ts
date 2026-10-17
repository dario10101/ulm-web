import { defineAsyncComponent, type Component } from 'vue'

/**
 * Vista publica de cada tipo de seccion del blog: el mismo catalogo que
 * ulm-core (app/services/blog_section_types.py). Agregar un tipo = un
 * componente en views/public/blog/ y una linea aca. Un tipo que el front
 * todavia no conoce no sale en el menu (ver PublicLayout).
 */
export const BLOG_SECTION_VIEWS: Record<string, Component> = {
  home: defineAsyncComponent(() => import('@/views/public/blog/HomeSection.vue')),
  about: defineAsyncComponent(() => import('@/views/public/blog/AboutSection.vue')),
  professional: defineAsyncComponent(() => import('@/views/public/blog/ProfessionalSection.vue')),
  collection: defineAsyncComponent(() => import('@/views/public/blog/CollectionSection.vue')),
}

export function isKnownSectionType(type: string): boolean {
  return type in BLOG_SECTION_VIEWS
}
