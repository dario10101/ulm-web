<script setup lang="ts">
import { computed, ref } from 'vue'

import { niceStep, type ChartItem, type ValueFormatter } from './types'

// Columnas verticales en orden (series de tiempo: meses, años). HTML/CSS en
// vez de SVG: los anchos se reparten solos con flex y el texto no se deforma
// con el viewBox.
const props = withDefaults(
  defineProps<{
    items: ChartItem[]
    format?: ValueFormatter
    axisFormat?: ValueFormatter
    colorClass?: string
    showAverage?: boolean
    /** Muestra la variacion % contra la columna anterior (ej. año a año). */
    showDelta?: boolean
    /** Para el color del delta: en gastos subir es malo, en ingresos es bueno. */
    increaseIsGood?: boolean
    highlightKey?: string
  }>(),
  {
    format: (value: number) => String(value),
    axisFormat: undefined,
    colorClass: 'text-accent-text',
    showAverage: false,
    showDelta: false,
    increaseIsGood: false,
    highlightKey: undefined,
  },
)

const axis = computed(() => props.axisFormat ?? props.format)

const maxValue = computed(() => Math.max(...props.items.map((i) => i.value), 0))
const step = computed(() => niceStep(maxValue.value / 4))
const yMax = computed(() =>
  Math.max(Math.ceil(maxValue.value / step.value) * step.value, step.value),
)
const ticks = computed(() => {
  const result: number[] = []
  for (let v = 0; v <= yMax.value + 1e-9; v += step.value) result.push(v)
  return result.reverse()
})

const average = computed(() =>
  props.items.length ? props.items.reduce((sum, i) => sum + i.value, 0) / props.items.length : 0,
)

function heightPct(value: number): number {
  // Sin soporte de negativos por ahora: se dibujan como 0.
  return (Math.max(0, value) / yMax.value) * 100
}

function delta(index: number): number | null {
  if (index === 0) return null
  const previous = props.items[index - 1].value
  if (!previous) return null
  return ((props.items[index].value - previous) / previous) * 100
}

// Alto reservado para las etiquetas del eje X (mas alto si lleva el delta).
const labelHeight = computed(() => (props.showDelta ? '2rem' : '1.5rem'))

function deltaClass(value: number): string {
  const good = props.increaseIsGood ? value > 0 : value < 0
  return good ? 'text-success-text' : 'text-ruby-text'
}

const hovered = ref<number | null>(null)
</script>

<template>
  <div class="select-none">
    <div class="flex h-60 gap-2">
      <!-- Eje Y -->
      <div
        class="flex flex-col justify-between text-right text-[10px] text-muted"
        :style="{ paddingBottom: labelHeight }"
      >
        <span v-for="tick in ticks" :key="tick" class="-translate-y-1/2 leading-none">
          {{ axis(tick) }}
        </span>
      </div>

      <div class="relative flex-1">
        <!-- Gridlines + linea de promedio -->
        <div
          class="absolute inset-x-0 top-0 flex flex-col justify-between"
          :style="{ bottom: labelHeight }"
        >
          <div v-for="tick in ticks" :key="tick" class="border-t border-subtle" />
        </div>
        <div
          v-if="showAverage && items.length > 1"
          class="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/60"
          :style="{
            bottom: `calc(${labelHeight} + (100% - ${labelHeight}) * ${heightPct(average) / 100})`,
          }"
        >
          <span
            class="absolute -top-4 right-0 rounded bg-background/80 px-1 text-[10px] text-muted"
          >
            avg {{ axis(average) }}
          </span>
        </div>

        <!-- Columnas -->
        <div class="absolute inset-0 flex items-stretch gap-1.5">
          <div
            v-for="(item, index) in items"
            :key="item.key"
            class="relative flex min-w-0 flex-1 flex-col items-center"
            @pointerenter="hovered = index"
            @pointerleave="hovered = null"
          >
            <div class="relative flex w-full flex-1 items-end justify-center">
              <div
                class="w-full max-w-12 rounded-t-md bg-current transition-opacity"
                :class="[
                  item.colorClass ?? colorClass,
                  (hovered !== null && hovered !== index) ||
                  (highlightKey && highlightKey !== item.key && hovered === null)
                    ? 'opacity-40'
                    : '',
                ]"
                :style="{
                  height: `${heightPct(item.value)}%`,
                  minHeight: item.value ? '2px' : '0',
                }"
              />
              <!-- Tooltip -->
              <div
                v-if="hovered === index"
                class="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-subtle bg-surface px-2.5 py-1.5 text-xs shadow-lg"
                :style="{ bottom: `calc(${heightPct(item.value)}% + 4px)` }"
              >
                <p class="font-semibold text-foreground">{{ item.label }}</p>
                <p class="text-foreground">{{ format(item.value) }}</p>
                <p v-if="item.meta" class="text-muted">{{ item.meta }}</p>
              </div>
            </div>
            <div
              class="flex flex-col items-center justify-start pt-1 leading-none"
              :style="{ height: labelHeight }"
            >
              <span class="truncate text-[10px] text-muted">{{ item.label }}</span>
              <span
                v-if="showDelta && delta(index) !== null"
                class="mt-0.5 text-[10px] font-medium"
                :class="deltaClass(delta(index)!)"
              >
                {{ delta(index)! > 0 ? '▲' : '▼' }} {{ Math.abs(Math.round(delta(index)!)) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
