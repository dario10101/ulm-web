<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import FilterPanel from '@/components/layout/FilterPanel.vue'
import { bottomNavItems, mainNavItems } from '@/config/nav'
import { useLayoutState } from '@/composables/useLayoutState'

const route = useRoute()
const { isSidebarOpen, isSidebarCollapsed, closeSidebar, toggleSidebarCollapsed } = useLayoutState()

// En mobile el sidebar es un drawer: se cierra solo al cambiar de ruta.
watch(
  () => route.fullPath,
  () => closeSidebar(),
)

// El modo colapsado solo aplica en desktop (prefijo lg:); en mobile el drawer
// siempre muestra etiquetas completas.
const collapsed = isSidebarCollapsed

const linkClass = computed(() => [
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface',
  collapsed.value && 'lg:justify-center lg:px-0',
])
const labelClass = computed(() => ['truncate', collapsed.value && 'lg:hidden'])
const activeLinkClass = 'bg-accent/15 text-accent-text'
</script>

<template>
  <!-- Backdrop del drawer en mobile -->
  <div
    v-if="isSidebarOpen"
    class="fixed inset-0 z-30 bg-black/30 lg:hidden"
    @click="closeSidebar"
  />

  <!--
    En desktop es sticky con altura de viewport: el scroll de la pagina no lo
    arrastra, y si su propio contenido no cabe, scrollea por separado.
  -->
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col overflow-y-auto overflow-x-hidden border-r border-subtle bg-surface p-3 transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    :class="{ 'translate-x-0': isSidebarOpen, 'lg:w-16 lg:px-2': collapsed }"
  >
    <!-- 1. Seccion principal -->
    <nav class="flex flex-col gap-1">
      <RouterLink
        v-for="item in mainNavItems"
        :key="item.label"
        :to="item.to"
        :class="linkClass"
        :active-class="activeLinkClass"
        :title="collapsed ? item.label : undefined"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        <span :class="labelClass">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 2. Seccion de filtros: solo si la ruta actual la amerita (oculta en modo rail) -->
    <FilterPanel
      v-if="route.meta.hasFilters"
      :labels="route.meta.filterLabels ?? []"
      :class="{ 'lg:hidden': collapsed }"
    />

    <div class="flex-1" />

    <!-- 3. Configuracion -->
    <nav class="flex flex-col gap-1 border-t border-subtle pt-3">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.label"
        :to="item.to"
        :class="linkClass"
        :active-class="activeLinkClass"
        :title="collapsed ? item.label : undefined"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        <span :class="labelClass">{{ item.label }}</span>
      </RouterLink>

      <!-- 4. Colapsar/expandir: solo desktop (en mobile manda el drawer) -->
      <button
        type="button"
        class="hidden lg:flex"
        :class="linkClass"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="!collapsed"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebarCollapsed"
      >
        <PanelLeftOpen v-if="collapsed" class="h-4 w-4 shrink-0" />
        <PanelLeftClose v-else class="h-4 w-4 shrink-0" />
        <span :class="labelClass">Collapse</span>
      </button>
    </nav>
  </aside>
</template>
