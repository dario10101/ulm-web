/**
 * Una pestaña abierta desde antes de un deploy pide las secciones (chunks con
 * hash) del deploy anterior, que ya no existen: la navegacion falla. Vite
 * emite `vite:preloadError` en ese caso; se recarga la pagina para traer el
 * index.html nuevo.
 *
 * Solo una vez por ventana de tiempo: si el chunk sigue fallando tras recargar
 * (API caida, sin red), recargar en bucle no lo arregla. Ahi el error sigue su
 * curso normal.
 */
const STORAGE_KEY = 'ulm:stale-assets-reload'
const MIN_INTERVAL_MS = 10_000

export function installReloadOnStaleAssets(): void {
  window.addEventListener('vite:preloadError', (event) => {
    const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0)
    if (Date.now() - last < MIN_INTERVAL_MS) return
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
    event.preventDefault()
    window.location.reload()
  })
}
