import { computed, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import { ApiError } from '@/lib/http'
import { setSectionContent } from '@/services/blogAdminApi'
import type { AdminSection } from '@/types/blogAdmin'

/**
 * Estado de un formulario de plantilla del blog (Inicio, Sobre mi...): una
 * copia editable del contenido, si tiene cambios sin guardar y el guardado
 * (PUT /blog/sections/{id}/content). Salir de la pagina con cambios pide
 * confirmacion.
 *
 * `toPayload` limpia el borrador antes de mandarlo (ej. una URL opcional
 * vacia pasa a null: el backend rechaza "" como URL).
 */
export function useSectionContentForm<C extends object>(
  section: () => AdminSection,
  options: { toPayload: (draft: C) => unknown; onSaved: (section: AdminSection) => void },
) {
  const clone = (content: unknown) => JSON.parse(JSON.stringify(content)) as C

  const draft = ref(clone(section().content)) as Ref<C>
  const baseline = ref(JSON.stringify(draft.value))
  const dirty = computed(() => JSON.stringify(draft.value) !== baseline.value)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const saved = ref(false)

  async function save(): Promise<void> {
    saving.value = true
    error.value = null
    saved.value = false
    try {
      const updated = await setSectionContent(section().id, options.toPayload(draft.value))
      // El backend normaliza (ej. URLs): el borrador pasa a ser lo guardado.
      draft.value = clone(updated.content)
      baseline.value = JSON.stringify(draft.value)
      saved.value = true
      options.onSaved(updated)
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Could not save the changes.'
    } finally {
      saving.value = false
    }
  }

  onBeforeRouteLeave(
    () => !dirty.value || window.confirm('You have unsaved changes. Leave anyway?'),
  )

  return { draft, dirty, saving, error, saved, save }
}

/** "" (o solo espacios) -> null, para los campos opcionales del backend. */
export function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}
