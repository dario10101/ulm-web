<script setup lang="ts">
import { Activity, Sun } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PulseView from '@/components/dashboard/PulseView.vue'
import TodayView from '@/components/dashboard/TodayView.vue'

// "Quick access": pagina de aterrizaje con dos vistas. Ver
// ulm-doc/plans/PLAN-DASHBOARD.md.
const VIEWS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'pulse', label: 'Weekly pulse', icon: Activity },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const route = useRoute()
const router = useRouter()

// La vista activa vive en la URL, como en View records: sin param (o con uno
// invalido) se muestra "today" y se corrige la URL, asi cada vista tiene una
// sola direccion y recargar no la pierde.
const activeView = computed<ViewId>(
  () => VIEWS.find((view) => view.id === route.params.view)?.id ?? 'today',
)

watch(
  () => route.params.view,
  (view) => {
    if (view !== activeView.value) {
      router.replace({ name: 'admin-dashboard', params: { view: activeView.value } })
    }
  },
  { immediate: true },
)

function selectView(view: ViewId) {
  router.push({ name: 'admin-dashboard', params: { view } })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Quick access</h1>
      <p class="text-sm text-muted">
        {{
          activeView === 'today'
            ? "What's on today, and quick ways to log it."
            : 'How this week compares with the previous ones.'
        }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2 border-b border-subtle pb-4">
      <button
        v-for="view in VIEWS"
        :key="view.id"
        type="button"
        class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          activeView === view.id
            ? 'bg-accent/10 text-accent-text'
            : 'text-muted hover:bg-surface hover:text-foreground'
        "
        @click="selectView(view.id)"
      >
        <component :is="view.icon" class="h-4 w-4" />
        {{ view.label }}
      </button>
    </div>

    <TodayView v-if="activeView === 'today'" />
    <PulseView v-else />
  </div>
</template>
