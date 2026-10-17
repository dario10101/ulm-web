import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'

import type { PublicSection } from '@/types/blog'

/**
 * Blog que se esta viendo (/blog/<username>). Lo resuelve PublicLayout contra
 * la API (un solo request trae el menu y el contenido de las plantillas) y lo
 * provee a las paginas; null en la landing (/blog) o mientras carga.
 */
export interface BlogOwner {
  username: string
  displayName: string | null
  /** Solo las habilitadas, en el orden del menu. */
  sections: PublicSection[]
}

export const blogOwnerKey: InjectionKey<ComputedRef<BlogOwner | null>> = Symbol('blogOwner')

export function useBlogOwner(): ComputedRef<BlogOwner | null> {
  return inject(
    blogOwnerKey,
    computed(() => null),
    false,
  )
}
