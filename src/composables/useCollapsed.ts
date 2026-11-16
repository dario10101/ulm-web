import { ref, watch, type Ref } from 'vue'

const STORAGE_PREFIX = 'ulm.collapsed.'

/**
 * Estado contraido/expandido de un bloque, recordado por navegador
 * (localStorage, como el tema). Sin valor guardado vale `defaultCollapsed`.
 * localStorage puede no estar disponible (modo privado, tests): se degrada a
 * un estado que dura solo mientras la pagina este abierta.
 */
export function useCollapsed(key: string, defaultCollapsed = true): Ref<boolean> {
  const storageKey = STORAGE_PREFIX + key
  const collapsed = ref(read(storageKey) ?? defaultCollapsed)
  watch(collapsed, (value) => {
    try {
      localStorage.setItem(storageKey, String(value))
    } catch {
      // Sin persistencia.
    }
  })
  return collapsed
}

function read(storageKey: string): boolean | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === null ? null : value === 'true'
  } catch {
    return null
  }
}
