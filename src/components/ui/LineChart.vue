<script setup lang="ts">
import { computed, ref } from 'vue'

interface LineChartPoint {
  label: string
  sublabel?: string
}

interface LineChartSeries {
  id: string
  label: string
  color: string
  values: number[]
  // Linea de referencia derivada (ej. promedio): trazo punteado, sin marcador
  // solido de fin de linea. Nunca uno de los colores categoricos.
  dashed?: boolean
}

const props = defineProps<{
  points: LineChartPoint[]
  series: LineChartSeries[]
  yAxisLabel?: string
  // Agrega una serie extra con el promedio de `series` en cada punto.
  showAverage?: boolean
}>()

const CHART_W = 800
const CHART_H = 240
const PADDING = { top: 14, right: 16, bottom: 28, left: 34 }
const innerW = CHART_W - PADDING.left - PADDING.right
const innerH = CHART_H - PADDING.top - PADDING.bottom

// Texto/foreground de la app, no negro puro: el tema es oscuro fijo (fondo
// casi negro), asi que un negro literal seria practicamente invisible.
const AVERAGE_COLOR = '#F0F0F0'

const averageSeries = computed<LineChartSeries | null>(() => {
  if (!props.showAverage || props.series.length === 0) return null
  const values = props.points.map((_, index) => {
    const valuesAtPoint = props.series.map((s) => s.values[index] ?? 0)
    const sum = valuesAtPoint.reduce((total, value) => total + value, 0)
    return Math.round(sum / valuesAtPoint.length)
  })
  return { id: '__average__', label: 'Average', color: AVERAGE_COLOR, values, dashed: true }
})

// Todo lo que se dibuja/lista (lineas de categoria + el promedio, si aplica).
const allSeries = computed(() =>
  averageSeries.value ? [...props.series, averageSeries.value] : props.series,
)

const maxValue = computed(() => Math.max(...allSeries.value.flatMap((s) => s.values), 1))

// "Nice numbers" para el eje Y: el paso se redondea a 1/2/5 * 10^n para que
// los ticks queden en numeros limpios sin importar la escala (~100 en
// semanal, ~500 en mensual), en vez de fracciones raras.
function niceStep(roughStep: number): number {
  const exponent = Math.floor(Math.log10(roughStep))
  const fraction = roughStep / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

const yStep = computed(() => niceStep(maxValue.value / 4 || 1))
const yMax = computed(() => Math.ceil(maxValue.value / yStep.value) * yStep.value)
const yTicks = computed(() => {
  const ticks: number[] = []
  for (let v = 0; v <= yMax.value + 1e-9; v += yStep.value) ticks.push(Math.round(v))
  return ticks
})

function xFor(index: number): number {
  if (props.points.length <= 1) return PADDING.left + innerW / 2
  return PADDING.left + (innerW * index) / (props.points.length - 1)
}

function yFor(value: number): number {
  return PADDING.top + innerH - (value / yMax.value) * innerH
}

function pathFor(series: LineChartSeries): string {
  return series.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(v)}`).join(' ')
}

// Crosshair + tooltip compartido: sigue al puntero y se ajusta al indice de
// semana mas cercano, mostrando todas las series a la vez (ver skill dataviz).
const svgEl = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)

function handlePointerMove(event: PointerEvent) {
  if (!svgEl.value || props.points.length === 0) return
  const rect = svgEl.value.getBoundingClientRect()
  const localX = ((event.clientX - rect.left) / rect.width) * CHART_W
  const step = props.points.length <= 1 ? innerW : innerW / (props.points.length - 1)
  const rawIndex = (localX - PADDING.left) / step
  hoverIndex.value = Math.min(props.points.length - 1, Math.max(0, Math.round(rawIndex)))
}

function handlePointerLeave() {
  hoverIndex.value = null
}

// Evita que el tooltip se salga del contenedor cerca de los bordes: cerca del
// borde izquierdo/derecho se ancla a ese lado en vez de centrarse en el punto.
const tooltipStyle = computed(() => {
  if (hoverIndex.value === null) return {}
  const leftPct = (xFor(hoverIndex.value) / CHART_W) * 100
  const translateX = leftPct < 20 ? '0%' : leftPct > 80 ? '-100%' : '-50%'
  return { left: `${leftPct}%`, transform: `translateX(${translateX})` }
})
</script>

<template>
  <div class="relative select-none">
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
      class="w-full"
      role="img"
      :aria-label="yAxisLabel ?? 'Line chart'"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
    >
      <!-- Gridlines horizontales (una por tick del eje Y) -->
      <g>
        <line
          v-for="tick in yTicks"
          :key="tick"
          :x1="PADDING.left"
          :x2="CHART_W - PADDING.right"
          :y1="yFor(tick)"
          :y2="yFor(tick)"
          stroke="#333333"
          stroke-width="1"
        />
        <text
          v-for="tick in yTicks"
          :key="`label-${tick}`"
          :x="PADDING.left - 8"
          :y="yFor(tick)"
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-muted text-[10px]"
        >
          {{ tick }}
        </text>
      </g>

      <!-- Eje X: numero de semana -->
      <text
        v-for="(point, index) in points"
        :key="`x-${index}`"
        :x="xFor(index)"
        :y="CHART_H - PADDING.bottom + 18"
        text-anchor="middle"
        class="fill-muted text-[10px]"
      >
        {{ point.label }}
      </text>

      <!-- Crosshair -->
      <line
        v-if="hoverIndex !== null"
        :x1="xFor(hoverIndex)"
        :x2="xFor(hoverIndex)"
        :y1="PADDING.top"
        :y2="CHART_H - PADDING.bottom"
        stroke="#A6A6A6"
        stroke-width="1"
        stroke-dasharray="3 3"
      />

      <!-- Lineas por categoria (+ promedio, si esta activo) -->
      <g v-for="s in allSeries" :key="s.id">
        <path
          :d="pathFor(s)"
          fill="none"
          :stroke="s.color"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :stroke-dasharray="s.dashed ? '6 4' : undefined"
        />
        <circle
          v-if="s.values.length && !s.dashed"
          :cx="xFor(s.values.length - 1)"
          :cy="yFor(s.values[s.values.length - 1])"
          r="4"
          :fill="s.color"
          stroke="#242424"
          stroke-width="2"
        />
        <circle
          v-if="hoverIndex !== null"
          :cx="xFor(hoverIndex)"
          :cy="yFor(s.values[hoverIndex])"
          r="4"
          :fill="s.color"
          stroke="#242424"
          stroke-width="2"
        />
      </g>
    </svg>

    <!-- Tooltip: valores de todas las series en la semana bajo el cursor -->
    <div
      v-if="hoverIndex !== null"
      class="pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-lg border border-subtle bg-surface p-2.5 text-xs shadow-lg"
      :style="tooltipStyle"
    >
      <p class="mb-1.5 font-semibold text-foreground">{{ points[hoverIndex].label }}</p>
      <p v-if="points[hoverIndex].sublabel" class="mb-1.5 -mt-1 text-[11px] text-muted">
        {{ points[hoverIndex].sublabel }}
      </p>
      <div
        v-for="s in allSeries"
        :key="s.id"
        class="flex items-center justify-between gap-3 py-0.5"
      >
        <span class="flex items-center gap-1.5 text-muted">
          <span
            class="w-3 rounded-full"
            :class="s.dashed ? 'h-0 border-t-2 border-dashed' : 'h-0.5'"
            :style="s.dashed ? { borderColor: s.color } : { backgroundColor: s.color }"
          />
          {{ s.label }}
        </span>
        <span class="font-semibold text-foreground">{{ s.values[hoverIndex] }}</span>
      </div>
    </div>

    <!-- Leyenda -->
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span v-for="s in allSeries" :key="s.id" class="flex items-center gap-1.5 text-xs text-muted">
        <span
          class="w-3 rounded-full"
          :class="s.dashed ? 'h-0 border-t-2 border-dashed' : 'h-0.5'"
          :style="s.dashed ? { borderColor: s.color } : { backgroundColor: s.color }"
        />
        {{ s.label }}
      </span>
    </div>
  </div>
</template>
