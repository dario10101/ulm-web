import { ref } from 'vue'

// Estado singleton (fuera de la funcion) para que Sidebar y Topbar
// compartan el mismo estado de la app shell sin pasar props/eventos.
const isSidebarOpen = ref(false)

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

  return { isSidebarOpen, openSidebar, closeSidebar, toggleSidebar }
}
