<script setup lang="ts">
import { computed, ref } from 'vue'

import { FALLBACK_CHART_COLORS, type ChartItem, type ValueFormatter } from './types'

// Dona + leyenda con monto y %: para "parte de un todo" con pocas porciones
// (categorias). Con muchas porciones chicas se agrupan en "Other" para que
// la dona siga siendo legible.
const props = withDefaults(
  defineProps<{
    items: ChartItem[]
    format?: ValueFormatter
    centerLabel?: string
    maxSlices?: number
  }>(),
  { format: (value: number) => String(value), centerLabel: 'Total', maxSlices: 7 },
)

const RADIUS = 60
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const slices = computed<ChartItem[]>(() => {
  const sorted = [...props.items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const colored = sorted.map((item, index) => ({
    ...item,
    colorClass: item.colorClass ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length],
  }))
  if (colored.length <= props.maxSlices) return colored
  const head = colored.slice(0, props.maxSlices - 1)
  const rest = colored.slice(props.maxSlices - 1)
  return [
    ...head,
    {
      key: '__other__',
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, item) => sum + item.value, 0),
      colorClass: 'text-slate-400',
    },
  ]
})

const total = computed(() => slices.value.reduce((sum, item) => sum + item.value, 0))

const arcs = computed(() => {
  let offset = 0
  return slices.value.map((item) => {
    const length = total.value ? (item.value / total.value) * CIRCUMFERENCE : 0
    // Un pequeño hueco entre porciones las separa visualmente.
    const gap = slices.value.length > 1 ? Math.min(2, length / 2) : 0
    const arc = { item, dasharray: `${length - gap} ${CIRCUMFERENCE}`, dashoffset: -offset }
    offset += length
    return arc
  })
})

const hovered = ref<string | null>(null)
const hoveredItem = computed(() => slices.value.find((s) => s.key === hovered.value) ?? null)

function percent(value: number): string {
  return total.value ? `${Math.round((value / total.value) * 100)}%` : '0%'
}
</script>

<template>
  <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
    <div class="relative h-44 w-44 shrink-0">
      <svg
        viewBox="0 0 160 160"
        class="h-full w-full -rotate-90"
        role="img"
        aria-label="Donut chart"
      >
        <circle cx="80" cy="80" :r="RADIUS" fill="none" stroke="#2E2E2E" :stroke-width="STROKE" />
        <circle
          v-for="arc in arcs"
          :key="arc.item.key"
          cx="80"
          cy="80"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          :stroke-width="hovered === arc.item.key ? STROKE + 4 : STROKE"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
          class="cursor-pointer transition-all"
          :class="[arc.item.colorClass, hovered && hovered !== arc.item.key ? 'opacity-30' : '']"
          @pointerenter="hovered = arc.item.key"
          @pointerleave="hovered = null"
        />
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="max-w-24 truncate text-[11px] text-muted">
          {{ hoveredItem ? hoveredItem.label : centerLabel }}
        </span>
        <span class="text-base font-semibold text-foreground">
          {{ format(hoveredItem ? hoveredItem.value : total) }}
        </span>
        <span v-if="hoveredItem" class="text-[11px] text-muted">
          {{ percent(hoveredItem.value) }}
        </span>
      </div>
    </div>

    <ul class="w-full min-w-0 flex-1 space-y-1">
      <li
        v-for="item in slices"
        :key="item.key"
        class="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors"
        :class="hovered === item.key ? 'bg-surface-hover' : ''"
        @pointerenter="hovered = item.key"
        @pointerleave="hovered = null"
      >
        <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-current" :class="item.colorClass" />
        <component :is="item.icon" v-if="item.icon" class="h-3.5 w-3.5 shrink-0 text-muted" />
        <span class="min-w-0 flex-1 truncate text-foreground" :title="item.label">
          {{ item.label }}
        </span>
        <span class="w-10 text-right text-xs text-muted">{{ percent(item.value) }}</span>
        <span class="w-24 text-right font-medium text-foreground">{{ format(item.value) }}</span>
      </li>
    </ul>
  </div>
</template>
