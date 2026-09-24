import { ref } from 'vue'

import { listCategories } from '@/services/checklistsApi'
import type { Category } from '@/types/checklist'

/**
 * Categorias del checklist, compartidas por toda la app.
 *
 * El estado vive FUERA de la funcion (igual que `useLayoutState`): son datos
 * globales y casi inmutables, asi que todas las vistas comparten la misma
 * lista y la peticion se hace una sola vez, en vez de una por vista que las
 * necesite.
 *
 * Tras guardar categorias hay que llamar a `invalidate()` para que la proxima
 * vista que las pida las vuelva a traer.
 */
const categories = ref<Category[]>([])
let loaded = false
let inFlight: Promise<void> | null = null

export function useCategories() {
  async function ensureLoaded(): Promise<void> {
    if (loaded) return
    // Si dos vistas montan a la vez, comparten la misma peticion en curso.
    if (inFlight) return inFlight

    inFlight = listCategories()
      .then((result) => {
        categories.value = result
        loaded = true
      })
      .catch(() => {
        // Quien llama muestra su propio error de carga; aca solo evitamos
        // dejar la promesa colgada y permitimos reintentar.
      })
      .finally(() => {
        inFlight = null
      })

    return inFlight
  }

  function invalidate(): void {
    loaded = false
  }

  function categoryName(categoryId: number): string {
    return categories.value.find((c) => c.id === categoryId)?.name ?? ''
  }

  return { categories, ensureLoaded, invalidate, categoryName }
}
