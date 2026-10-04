import { computed, ref, shallowRef } from 'vue'

import { ApiError } from '@/lib/http'
import type { CatalogApi } from '@/services/paramsApi'
import type { AdminCatalogItem } from '@/types/params'

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

/**
 * Estado y acciones de un panel de catalogo (tags, fuentes, categorias...):
 * listar, alta/edicion en un dialogo, borrado hibrido con confirmacion y
 * restaurar un archivado. Cada panel solo pone los campos propios.
 *
 * `toPayload` arma el cuerpo completo del PUT a partir de un item: restaurar
 * es un update con status ENABLED (el PUT reemplaza el item entero).
 * `onChanged` corre despues de cualquier escritura: los paneles invalidan ahi
 * los caches de opciones de los formularios (useExpenseOptions...).
 */
export function useCatalogPanel<Item extends AdminCatalogItem, Payload>(
  api: CatalogApi<Item, Payload>,
  // NoInfer: Payload sale de `api`; si no, TS lo deduciria del literal que
  // devuelve toPayload (sin `status`) y el save del panel no compilaria.
  options: { toPayload: (item: Item) => NoInfer<Payload>; onChanged?: () => void },
) {
  // shallowRef: la lista se reemplaza entera en cada load (y con un generico,
  // ref() desenvolveria el tipo y dejaria de ser Item[]).
  const items = shallowRef<Item[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      items.value = await api.list()
    } catch (err) {
      loadError.value = messageOf(err, 'Could not load this list.')
    } finally {
      loading.value = false
    }
  }

  async function afterWrite(): Promise<void> {
    options.onChanged?.()
    await load()
  }

  // --- Alta / edicion ---

  const dialogOpen = ref(false)
  const editing = shallowRef<Item | null>(null)
  const saving = ref(false)
  const formError = ref<string | null>(null)

  function openCreate(): void {
    editing.value = null
    formError.value = null
    dialogOpen.value = true
  }

  function openEdit(item: Item): void {
    editing.value = item
    formError.value = null
    dialogOpen.value = true
  }

  function closeDialog(): void {
    dialogOpen.value = false
  }

  async function save(payload: Payload): Promise<void> {
    saving.value = true
    formError.value = null
    try {
      if (editing.value) await api.update(editing.value.id, payload)
      else await api.create(payload)
      dialogOpen.value = false
      await afterWrite()
    } catch (err) {
      formError.value = messageOf(err, 'Could not save.')
    } finally {
      saving.value = false
    }
  }

  // --- Borrado hibrido y restaurar ---

  const deleting = shallowRef<Item | null>(null)
  const deleteSaving = ref(false)
  const deleteError = ref<string | null>(null)
  // Resultado de la ultima accion, para que el usuario sepa si se borro o se archivo.
  const notice = ref<string | null>(null)

  function askDelete(item: Item): void {
    deleting.value = item
    deleteError.value = null
  }

  async function confirmDelete(): Promise<void> {
    const item = deleting.value
    if (!item) return
    deleteSaving.value = true
    deleteError.value = null
    try {
      const { result } = await api.remove(item.id)
      notice.value =
        result === 'ARCHIVED'
          ? `"${item.name}" was archived: it's kept in your history but hidden from forms.`
          : `"${item.name}" was deleted.`
      deleting.value = null
      await afterWrite()
    } catch (err) {
      deleteError.value = messageOf(err, 'Could not delete.')
    } finally {
      deleteSaving.value = false
    }
  }

  async function restore(item: Item): Promise<void> {
    notice.value = null
    try {
      await api.update(item.id, { ...options.toPayload(item), status: 'ENABLED' })
      notice.value = `"${item.name}" was restored.`
      await afterWrite()
    } catch (err) {
      notice.value = messageOf(err, 'Could not restore.')
    }
  }

  const activeCount = computed(() => items.value.filter((i) => i.status === 'ENABLED').length)
  const archivedCount = computed(() => items.value.length - activeCount.value)

  return {
    items,
    loading,
    loadError,
    load,
    activeCount,
    archivedCount,
    dialogOpen,
    editing,
    saving,
    formError,
    openCreate,
    openEdit,
    closeDialog,
    save,
    deleting,
    deleteSaving,
    deleteError,
    notice,
    askDelete,
    confirmDelete,
    restore,
  }
}
