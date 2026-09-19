<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

import FilterPanel from '@/components/layout/FilterPanel.vue'
import { bottomNavItems, mainNavItems } from '@/config/nav'
import { useLayoutState } from '@/composables/useLayoutState'

const route = useRoute()
const { isSidebarOpen, closeSidebar } = useLayoutState()

// En mobile el sidebar es un drawer: se cierra solo al cambiar de ruta.
watch(
  () => route.fullPath,
  () => closeSidebar(),
)

const linkClass =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface'
const activeLinkClass = 'bg-accent/15 text-accent-text'
</script>

<template>
  <!-- Backdrop del drawer en mobile -->
  <div
    v-if="isSidebarOpen"
    class="fixed inset-0 z-30 bg-black/30 lg:hidden"
    @click="closeSidebar"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-subtle bg-surface p-3 transition-transform lg:static lg:translate-x-0"
    :class="{ 'translate-x-0': isSidebarOpen }"
  >
    <!-- 1. Seccion principal -->
    <nav class="flex flex-col gap-1">
      <RouterLink
        v-for="item in mainNavItems"
        :key="item.label"
        :to="item.to"
        :class="linkClass"
        :active-class="activeLinkClass"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <!-- 2. Seccion de filtros: solo si la ruta actual la amerita -->
    <FilterPanel v-if="route.meta.hasFilters" :labels="route.meta.filterLabels ?? []" />

    <div class="flex-1" />

    <!-- 3. Configuracion -->
    <nav class="flex flex-col gap-1 border-t border-subtle pt-3">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.label"
        :to="item.to"
        :class="linkClass"
        :active-class="activeLinkClass"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
