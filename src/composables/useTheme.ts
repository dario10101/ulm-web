import { computed, ref } from 'vue'

/**
 * Tema claro/oscuro. La preferencia es por dispositivo (localStorage), no por
 * usuario: es lo habitual (el celular en oscuro, el PC en claro) y asi se
 * aplica antes del primer pintado, sin esperar a /me.
 *
 * El script inline de index.html hace lo mismo que `apply` al cargar la
 * pagina, para que no haya un destello del tema equivocado; si se cambia la
 * clave o la logica aca, hay que cambiarla alla tambien.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ulm-theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Almacenamiento bloqueado (modo privado, politicas): se sigue al sistema.
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

const preference = ref<ThemePreference>(readStored())
const systemDark = ref(systemPrefersDark())

const resolved = computed<'light' | 'dark'>(() =>
  preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
)

function apply(): void {
  document.documentElement.classList.toggle('dark', resolved.value === 'dark')
}

let listening = false

/** Engancha el tema al documento. Se llama una vez desde main.ts. */
export function installTheme(): void {
  apply()
  if (listening || typeof window.matchMedia !== 'function') return
  listening = true
  // En "system", cambiar el tema del SO cambia la app sin recargar.
  window.matchMedia(DARK_QUERY).addEventListener('change', (event) => {
    systemDark.value = event.matches
    apply()
  })
}

export function useTheme() {
  function setPreference(value: ThemePreference): void {
    preference.value = value
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // Sin almacenamiento el cambio vale para esta pestaña.
    }
    apply()
  }

  return { preference, resolved, setPreference }
}
