import { defineAsyncComponent, type Component } from 'vue'

/**
 * Formulario de cada tipo de seccion en /admin/blog: el mismo catalogo que
 * ulm-core (app/services/blog_section_types.py) y que la vista publica
 * (config/blogSectionTypes.ts). Agregar un tipo = un formulario en
 * components/blog-admin/forms/ y una linea aca. `hasItems`: ademas del
 * formulario, se administran subsecciones y .md.
 */
export const BLOG_SECTION_EDITORS: Record<string, { form: Component; hasItems: boolean }> = {
  home: {
    form: defineAsyncComponent(() => import('@/components/blog-admin/forms/HomeForm.vue')),
    hasItems: false,
  },
  about: {
    form: defineAsyncComponent(() => import('@/components/blog-admin/forms/AboutForm.vue')),
    hasItems: false,
  },
  professional: {
    form: defineAsyncComponent(() => import('@/components/blog-admin/forms/ProfessionalForm.vue')),
    hasItems: false,
  },
  collection: {
    form: defineAsyncComponent(() => import('@/components/blog-admin/forms/CollectionForm.vue')),
    hasItems: true,
  },
}

/** Nombre legible de un tipo, para el admin. */
export const SECTION_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  about: 'About me',
  professional: 'Professional profile',
  collection: 'Collection',
}
