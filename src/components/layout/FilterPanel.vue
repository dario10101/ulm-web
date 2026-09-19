<script setup lang="ts">
import { Filter } from '@lucide/vue'
import { ref } from 'vue'

// Filtros de ejemplo: alternan visualmente pero no filtran datos reales todavia
// (no hay fuente de datos real que filtrar en este prototipo).
const props = defineProps<{ labels: string[] }>()

const active = ref<string | null>(props.labels[0] ?? null)
</script>

<template>
  <div class="mt-4 border-t border-subtle pt-4">
    <p class="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
      <Filter class="h-3.5 w-3.5" />
      Filters
    </p>
    <div class="flex flex-wrap gap-1.5 px-3">
      <button
        v-for="label in labels"
        :key="label"
        type="button"
        class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          active === label
            ? 'bg-accent text-white'
            : 'bg-surface-hover text-muted hover:text-foreground'
        "
        @click="active = label"
      >
        {{ label }}
      </button>
    </div>
  </div>
</template>
