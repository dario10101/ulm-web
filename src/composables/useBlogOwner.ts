import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'

/**
 * Dueño del blog que se esta viendo (/blog/<username>). Lo resuelve
 * PublicLayout contra la API y lo provee a las paginas; null en la landing
 * (/blog) o mientras carga.
 */
export interface BlogOwner {
  username: string
  /** Si tiene el contenido de ejemplo quemado (ver data/blogDemo.ts). */
  hasDemoContent: boolean
}

export const blogOwnerKey: InjectionKey<ComputedRef<BlogOwner | null>> = Symbol('blogOwner')

export function useBlogOwner(): ComputedRef<BlogOwner | null> {
  return inject(
    blogOwnerKey,
    computed(() => null),
    false,
  )
}
