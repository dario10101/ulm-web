<script setup lang="ts">
import { computed } from 'vue'

import { FALLBACK_CHART_COLORS, type ChartItem, type ValueFormatter } from './types'

// Ranking de barras horizontales: mejor que una dona cuando hay muchas
// entradas o cuando las partes NO suman un todo (ej. tags: un gasto puede
// tener varios). El largo es relativo al maximo, no al total.
const props = withDefaults(
  defineProps<{
    items: ChartItem[]
    format?: ValueFormatter
    /** Si se pasa, muestra el % de cada fila sobre este total. */
    shareOf?: number
  }>(),
  { format: (value: number) => String(value), shareOf: undefined },
)

const rows = computed(() => {
  const sorted = [...props.items].sort((a, b) => b.value - a.value)
  const max = Math.max(...sorted.map((i) => i.value), 1)
  return sorted.map((item, index) => ({
    ...item,
    colorClass: item.colorClass ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length],
    widthPct: (item.value / max) * 100,
  }))
})

function share(value: number): string | null {
  if (!props.shareOf) return null
  return `${Math.round((value / props.shareOf) * 100)}%`
}
</script>

<template>
  <ul class="space-y-3">
    <li v-for="row in rows" :key="row.key" class="space-y-1">
      <div class="flex items-center gap-2 text-sm">
        <component
          :is="row.icon"
          v-if="row.icon"
          class="h-3.5 w-3.5 shrink-0"
          :class="row.colorClass"
        />
        <span class="min-w-0 flex-1 truncate text-foreground" :title="row.label">{{
          row.label
        }}</span>
        <span v-if="row.meta" class="text-xs text-muted">{{ row.meta }}</span>
        <span v-if="share(row.value)" class="w-10 text-right text-xs text-muted">
          {{ share(row.value) }}
        </span>
        <span class="w-24 text-right font-medium text-foreground">{{ format(row.value) }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          class="h-full rounded-full bg-current transition-all"
          :class="row.colorClass"
          :style="{ width: `${row.widthPct}%` }"
        />
      </div>
    </li>
  </ul>
</template>
