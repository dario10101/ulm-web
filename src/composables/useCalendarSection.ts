import { ref } from 'vue'

import { ApiError } from '@/lib/http'

/**
 * Carga perezosa de una vista del calendario (Daily / Weekly / Monthly / Yearly).
 *
 * Las cuatro vistas repetian exactamente el mismo esqueleto: un `loading`, un
 * `error`, el try/catch/finally alrededor del fetch, una bandera de "ya se
 * cargo una vez" para no pedir datos de una vista que el usuario nunca abre, y
 * un watcher que recarga al cambiar de fecha *solo si* ya se habia cargado.
 *
 * Lo que cambia entre vistas es que piden y en que rango, asi que eso queda del
 * lado de quien llama: este composable recibe la funcion de carga y se encarga
 * del resto.
 *
 * @param load funcion que hace el fetch y guarda el resultado donde corresponda
 * @param errorMessage mensaje a mostrar si el fallo no trae uno propio de la API
 */
export function useCalendarSection(load: () => Promise<void>, errorMessage: string) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false

  async function reload(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : errorMessage
    } finally {
      loading.value = false
    }
  }

  /** Primera carga: no hace nada si la vista ya se abrio antes. */
  function ensureLoaded(): void {
    if (loadedOnce) return
    loadedOnce = true
    void reload()
  }

  /**
   * Recarga al cambiar de fecha/rango, pero solo si la vista ya se cargo: si el
   * usuario nunca la abrio, no tiene sentido pedir datos que no va a ver.
   */
  function reloadIfLoaded(): void {
    if (loadedOnce) void reload()
  }

  return { loading, error, reload, ensureLoaded, reloadIfLoaded }
}
