<script setup lang="ts">
import { computed, ref } from 'vue'

import { niceStep, type ValueFormatter } from './types'

export interface GroupedSeries {
  key: string
  label: string
  /** Clase `text-*`: la columna se pinta con currentColor. */
  colorClass: string
}

export interface GroupedItem {
  key: string
  label: string
  /** Titulo del tooltip (ej. "Mar 2026"). */
  meta?: string
  /** Un valor por serie, en el mismo orden que `series`. */
  values: number[]
}

// Columnas agrupadas: por cada valor del eje X, una columna por serie lado a
// lado (ej. ingresos y gastos del mes). Para comparar magnitudes dentro de un
// periodo; la composicion de un total va en StackedColumnChart.
const props = withDefaults(
  defineProps<{
    series: GroupedSeries[]
    items: GroupedItem[]
    format?: ValueFormatter
    axisFormat?: ValueFormatter
    highlightKey?: string
  }>(),
  { format: (value: number) => String(value), axisFormat: undefined, highlightKey: undefined },
)

const axis = computed(() => props.axisFormat ?? props.format)

// Sin negativos: ingresos y gastos de un periodo son montos >= 0 (un ingreso
// neto negativo, posible solo con intereses en perdida, se dibuja como 0 y
// el valor real queda en el tooltip).
const maxValue = computed(() => Math.max(0, ...props.items.flatMap((i) => i.values)))
const step = computed(() => niceStep(maxValue.value / 4))
const yMax = computed(() =>
  Math.max(Math.ceil(maxValue.value / step.value) * step.value, step.value),
)
const ticks = computed(() => {
  const result: number[] = []
  for (let v = 0; v <= yMax.value + 1e-9; v += step.value) result.push(v)
  return result.reverse()
})

function heightPct(value: number): number {
  return (Math.max(0, value) / yMax.value) * 100
}

const hovered = ref<number | null>(null)

function dimmed(index: number, key: string): boolean {
  if (hovered.value !== null) return hovered.value !== index
  return Boolean(props.highlightKey) && props.highlightKey !== key
}
</script>

<template>
  <div class="select-none">
    <!-- Leyenda de series -->
    <div class="mb-3 flex flex-wrap gap-4 text-xs text-muted">
      <span v-for="s in series" :key="s.key" class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm bg-current" :class="s.colorClass" />
        {{ s.label }}
      </span>
    </div>

    <div class="flex h-60 gap-2">
      <div class="flex flex-col justify-between pb-6 text-right text-[10px] text-muted">
        <span v-for="tick in ticks" :key="tick" class="-translate-y-1/2 leading-none">
          {{ axis(tick) }}
        </span>
      </div>

      <div class="relative flex-1">
        <div class="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
          <div v-for="tick in ticks" :key="tick" class="border-t border-subtle" />
        </div>

        <div class="absolute inset-0 flex items-stretch gap-2">
          <div
            v-for="(item, index) in items"
            :key="item.key"
            class="relative flex min-w-0 flex-1 flex-col items-center"
            :data-test="`group-${item.key}`"
            @pointerenter="hovered = index"
            @pointerleave="hovered = null"
          >
            <div
              class="relative flex w-full flex-1 items-end justify-center gap-0.5 transition-opacity"
              :class="dimmed(index, item.key) ? 'opacity-40' : ''"
            >
              <div
                v-for="(s, seriesIndex) in series"
                :key="s.key"
                class="w-full max-w-6 rounded-t-sm bg-current"
                :class="s.colorClass"
                :style="{
                  height: `${heightPct(item.values[seriesIndex] ?? 0)}%`,
                  minHeight: item.values[seriesIndex] ? '2px' : '0',
                }"
              />

              <div
                v-if="hovered === index"
                class="pointer-events-none absolute bottom-full z-20 mb-1 min-w-40 whitespace-nowrap rounded-lg border border-subtle bg-surface px-2.5 py-1.5 text-xs shadow-lg"
                :class="index > items.length / 2 ? 'right-1/2' : 'left-1/2'"
              >
                <p class="font-semibold text-foreground">{{ item.meta ?? item.label }}</p>
                <p
                  v-for="(s, seriesIndex) in series"
                  :key="s.key"
                  class="mt-0.5 flex items-center gap-1.5 text-muted"
                >
                  <span class="h-2 w-2 shrink-0 rounded-full bg-current" :class="s.colorClass" />
                  <span class="flex-1">{{ s.label }}</span>
                  <span class="text-foreground">{{ format(item.values[seriesIndex] ?? 0) }}</span>
                </p>
                <slot name="tooltip-footer" :item="item" />
              </div>
            </div>
            <div class="flex h-6 items-start justify-center pt-1 leading-none">
              <span class="truncate text-[10px] text-muted">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
