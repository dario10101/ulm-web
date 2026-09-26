import { ref, watch } from 'vue'

const COLLAPSED_STORAGE_KEY = 'ulm.sidebarCollapsed'

// localStorage puede no estar disponible (modo privado, tests): se degrada a "expandido".
function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Estado singleton (fuera de la funcion) para que Sidebar y Topbar
// compartan el mismo estado de la app shell sin pasar props/eventos.
// `isSidebarOpen` es el drawer de mobile; `isSidebarCollapsed` es el modo
// "rail" (solo iconos) de desktop. Son independientes a proposito.
const isSidebarOpen = ref(false)
const isSidebarCollapsed = ref(readCollapsedPreference())

watch(isSidebarCollapsed, (collapsed) => {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed))
  } catch {
    // Sin persistencia: la preferencia dura solo la sesion.
  }
})

export function useLayoutState() {
  function openSidebar() {
    isSidebarOpen.value = true
  }

  function closeSidebar() {
    isSidebarOpen.value = false
  }

  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  function toggleSidebarCollapsed() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  return {
    isSidebarOpen,
    isSidebarCollapsed,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    toggleSidebarCollapsed,
  }
}
