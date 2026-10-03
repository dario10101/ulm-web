<script setup lang="ts">
import { computed, ref } from 'vue'

import { niceStep, type ValueFormatter } from './types'

export interface StackSegment {
  key: string
  label: string
  value: number
  /** Clase `text-*`: el segmento se pinta con currentColor. */
  colorClass: string
}

export interface StackedItem {
  key: string
  label: string
  /** Texto secundario del tooltip (ej. "Mar 2026 · 4 incomes"). */
  meta?: string
  segments: StackSegment[]
}

// Columnas apiladas en orden (meses, años): cada columna es la suma de sus
// segmentos (ej. fuentes de ingreso). Soporta valores negativos (un mes de
// perdida en una inversion): se apilan hacia abajo desde la linea de cero en
// vez de recortarse, para que el total de la columna siga siendo honesto.
const props = withDefaults(
  defineProps<{
    items: StackedItem[]
    format?: ValueFormatter
    axisFormat?: ValueFormatter
    showAverage?: boolean
    /** Variacion % del total contra la columna anterior. */
    showDelta?: boolean
    increaseIsGood?: boolean
    highlightKey?: string
  }>(),
  {
    format: (value: number) => String(value),
    axisFormat: undefined,
    showAverage: false,
    showDelta: false,
    increaseIsGood: true,
    highlightKey: undefined,
  },
)

const axis = computed(() => props.axisFormat ?? props.format)

interface Column {
  item: StackedItem
  positive: StackSegment[]
  negative: StackSegment[]
  positiveSum: number
  negativeSum: number
  total: number
}

const columns = computed<Column[]>(() =>
  props.items.map((item) => {
    const positive = item.segments.filter((s) => s.value > 0)
    const negative = item.segments.filter((s) => s.value < 0)
    const positiveSum = positive.reduce((sum, s) => sum + s.value, 0)
    const negativeSum = negative.reduce((sum, s) => sum + s.value, 0)
    return { item, positive, negative, positiveSum, negativeSum, total: positiveSum + negativeSum }
  }),
)

// Escala: paso "nice" sobre el rango completo; el minimo solo baja de 0 si
// hay negativos, y se redondea al mismo paso para que el cero caiga en un tick.
const scale = computed(() => {
  const max = Math.max(0, ...columns.value.map((c) => c.positiveSum))
  const min = Math.min(0, ...columns.value.map((c) => c.negativeSum))
  const step = niceStep((max - min) / 4 || 1)
  const yMax = Math.max(Math.ceil(max / step) * step, min < 0 ? 0 : step)
  const yMin = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = yMax; v >= yMin - 1e-9; v -= step) ticks.push(Math.abs(v) < 1e-9 ? 0 : v)
  return { yMax, yMin, range: yMax - yMin || 1, ticks }
})

function pct(value: number): number {
  return (Math.abs(value) / scale.value.range) * 100
}
// Distancia de la linea de cero al borde inferior del area de dibujo (%).
const zeroPct = computed(() => pct(scale.value.yMin))

const average = computed(() =>
  columns.value.length
    ? columns.value.reduce((sum, c) => sum + c.total, 0) / columns.value.length
    : 0,
)

function delta(index: number): number | null {
  if (index === 0) return null
  const previous = columns.value[index - 1].total
  if (!previous) return null
  return ((columns.value[index].total - previous) / Math.abs(previous)) * 100
}

function deltaClass(value: number): string {
  const good = props.increaseIsGood ? value > 0 : value < 0
  return good ? 'text-success-text' : 'text-ruby-text'
}

const labelHeight = computed(() => (props.showDelta ? '2rem' : '1.5rem'))
const hovered = ref<number | null>(null)

function dimmed(index: number, key: string): boolean {
  if (hovered.value !== null) return hovered.value !== index
  return Boolean(props.highlightKey) && props.highlightKey !== key
}
</script>

<template>
  <div class="select-none">
    <div class="flex h-64 gap-2">
      <!-- Eje Y -->
      <div
        class="flex flex-col justify-between text-right text-[10px] text-muted"
        :style="{ paddingBottom: labelHeight }"
      >
        <span v-for="tick in scale.ticks" :key="tick" class="-translate-y-1/2 leading-none">
          {{ axis(tick) }}
        </span>
      </div>

      <div class="relative flex-1">
        <!-- Gridlines (la del cero, mas marcada si hay negativos) -->
        <div
          class="absolute inset-x-0 top-0 flex flex-col justify-between"
          :style="{ bottom: labelHeight }"
        >
          <div
            v-for="tick in scale.ticks"
            :key="tick"
            class="border-t"
            :class="tick === 0 && scale.yMin < 0 ? 'border-foreground/40' : 'border-subtle'"
          />
        </div>
        <div
          v-if="showAverage && columns.length > 1"
          class="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/60"
          :style="{
            bottom: `calc(${labelHeight} + (100% - ${labelHeight}) * ${(zeroPct + (average >= 0 ? pct(average) : -pct(average))) / 100})`,
          }"
        >
          <span
            class="absolute -top-4 right-0 rounded bg-background/80 px-1 text-[10px] text-muted"
          >
            avg {{ axis(average) }}
          </span>
        </div>

        <div class="absolute inset-0 flex items-stretch gap-1.5">
          <div
            v-for="(column, index) in columns"
            :key="column.item.key"
            class="relative flex min-w-0 flex-1 flex-col items-center"
            :data-test="`column-${column.item.key}`"
            @pointerenter="hovered = index"
            @pointerleave="hovered = null"
          >
            <div
              class="relative w-full flex-1 transition-opacity"
              :class="dimmed(index, column.item.key) ? 'opacity-40' : ''"
            >
              <!-- Positivos: desde el cero hacia arriba -->
              <div
                class="absolute inset-x-0 mx-auto flex max-w-12 flex-col-reverse overflow-hidden rounded-t-md"
                :style="{ bottom: `${zeroPct}%`, height: `${pct(column.positiveSum)}%` }"
              >
                <div
                  v-for="segment in column.positive"
                  :key="segment.key"
                  class="w-full shrink-0 bg-current"
                  :class="segment.colorClass"
                  :style="{ height: `${(segment.value / column.positiveSum) * 100}%` }"
                />
              </div>
              <!-- Negativos: desde el cero hacia abajo -->
              <div
                v-if="column.negative.length"
                class="absolute inset-x-0 mx-auto flex max-w-12 flex-col overflow-hidden rounded-b-md"
                :style="{
                  top: `${100 - zeroPct}%`,
                  height: `${pct(column.negativeSum)}%`,
                }"
              >
                <div
                  v-for="segment in column.negative"
                  :key="segment.key"
                  class="w-full shrink-0 bg-current opacity-70"
                  :class="segment.colorClass"
                  :style="{ height: `${(segment.value / column.negativeSum) * 100}%` }"
                />
              </div>

              <!-- Tooltip con el desglose -->
              <div
                v-if="hovered === index"
                class="pointer-events-none absolute z-20 min-w-40 whitespace-nowrap rounded-lg border border-subtle bg-surface px-2.5 py-1.5 text-xs shadow-lg"
                :class="index > columns.length / 2 ? 'right-1/2' : 'left-1/2'"
                :style="{ bottom: `${zeroPct + pct(column.positiveSum)}%` }"
              >
                <p class="font-semibold text-foreground">
                  {{ column.item.meta ?? column.item.label }}
                </p>
                <p
                  v-for="segment in column.item.segments"
                  :key="segment.key"
                  class="mt-0.5 flex items-center gap-1.5 text-muted"
                >
                  <span
                    class="h-2 w-2 shrink-0 rounded-full bg-current"
                    :class="segment.colorClass"
                  />
                  <span class="flex-1">{{ segment.label }}</span>
                  <span :class="segment.value < 0 ? 'text-ruby-text' : 'text-foreground'">
                    {{ format(segment.value) }}
                  </span>
                </p>
                <p
                  class="mt-1 flex justify-between gap-3 border-t border-subtle pt-1 font-medium text-foreground"
                >
                  <span>Total</span>
                  <span>{{ format(column.total) }}</span>
                </p>
              </div>
            </div>
            <div
              class="flex flex-col items-center justify-start pt-1 leading-none"
              :style="{ height: labelHeight }"
            >
              <span class="truncate text-[10px] text-muted">{{ column.item.label }}</span>
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
