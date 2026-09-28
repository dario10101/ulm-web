<script setup lang="ts">
import { computed } from 'vue'

import { FALLBACK_CHART_COLORS, type ChartItem, type ValueFormatter } from './types'

// Una sola barra apilada al 100%: con pocas partes (ej. metodos de pago) se
// lee la proporcion de un vistazo, y el detalle queda en las tarjetas.
const props = withDefaults(defineProps<{ items: ChartItem[]; format?: ValueFormatter }>(), {
  format: (value: number) => String(value),
})

const parts = computed(() => {
  const sorted = [...props.items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const total = sorted.reduce((sum, item) => sum + item.value, 0) || 1
  return sorted.map((item, index) => ({
    ...item,
    colorClass: item.colorClass ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length],
    pct: (item.value / total) * 100,
  }))
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex h-5 gap-0.5 overflow-hidden rounded-full">
      <div
        v-for="part in parts"
        :key="part.key"
        class="h-full bg-current first:rounded-l-full last:rounded-r-full"
        :class="part.colorClass"
        :style="{ width: `${part.pct}%` }"
        :title="`${part.label}: ${format(part.value)} (${Math.round(part.pct)}%)`"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="part in parts"
        :key="part.key"
        class="flex items-center gap-3 rounded-lg border border-subtle p-3"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover"
          :class="part.colorClass"
        >
          <component :is="part.icon" v-if="part.icon" class="h-4 w-4" />
          <span v-else class="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-foreground">{{ part.label }}</p>
          <p class="text-xs text-muted">
            {{ Math.round(part.pct) }}%<template v-if="part.meta"> · {{ part.meta }}</template>
          </p>
        </div>
        <span class="text-sm font-semibold text-foreground">{{ format(part.value) }}</span>
      </div>
    </div>
  </div>
</template>
