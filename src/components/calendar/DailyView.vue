<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { useCategories } from '@/composables/useCategories'
import { formatDateLong, parseIsoDate, todayIsoDate } from '@/lib/date'
import { scrollElementIntoContainer } from '@/lib/dom'
import {
  computeTimelineBlocks,
  DEFAULT_VISIBLE_HOUR,
  HOURS,
  HOUR_ROW_HEIGHT,
  hourLabel,
  type TimelineBlock,
} from '@/lib/timeline'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Grilla de categorias (columnas) x horas (filas). En pantallas angostas se
 * reemplaza por una sola columna con las tareas mezcladas por hora.
 */
const props = defineProps<{
  date: string
  occurrences: CalendarTaskOccurrence[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openDetail: [occurrence: CalendarTaskOccurrence]
}>()

const { categories } = useCategories()

// Filtro de categoria: evita depender de mostrar todas las columnas a la vez,
// que es lo que forzaria scroll horizontal en pantallas angostas.
const selectedCategoryId = ref<number | 'ALL'>('ALL')
const visibleCategories = computed(() =>
  selectedCategoryId.value === 'ALL'
    ? categories.value
    : categories.value.filter((c) => c.id === selectedCategoryId.value),
)

/** Franja que marca la hora actual, solo si el dia que se ve es hoy. */
function isCurrentHourBlock(hour: number): boolean {
  return props.date === todayIsoDate() && hour === new Date().getHours()
}

function dayTimelineBlocks(categoryId: number): TimelineBlock[] {
  return computeTimelineBlocks(props.occurrences.filter((o) => o.category_id === categoryId))
}

/**
 * Mobile: una sola columna, sin separar por categoria. Respeta el mismo filtro
 * que el grid de escritorio (con "All" se mezclan todas en la misma lista).
 */
function mobileOccurrencesFor(hour: number): CalendarTaskOccurrence[] {
  const visibleIds = new Set(visibleCategories.value.map((c) => c.id))
  return props.occurrences.filter(
    (o) => visibleIds.has(o.category_id) && new Date(o.occurrence_local).getHours() === hour,
  )
}

// Existen dos layouts montados a la vez (mobile de una columna y el grid de
// escritorio), alternados por CSS: hay que ubicar cual esta realmente visible
// (offsetParent no nulo) antes de calcular el scroll.
let gridScrollEl: HTMLElement | null = null
const mobileHourRowEls: Record<number, HTMLElement | null> = {}
const desktopHourRowEls: Record<number, HTMLElement | null> = {}

function setGridScrollEl(el: Element | null) {
  gridScrollEl = el as HTMLElement | null
}

function setMobileHourRowEl(hour: number, el: Element | null) {
  mobileHourRowEls[hour] = el as HTMLElement | null
}

function setDesktopHourRowEl(hour: number, el: Element | null) {
  desktopHourRowEls[hour] = el as HTMLElement | null
}

function visibleHourRowEl(hour: number): HTMLElement | null {
  const mobile = mobileHourRowEls[hour]
  if (mobile?.offsetParent) return mobile
  const desktop = desktopHourRowEls[hour]
  if (desktop?.offsetParent) return desktop
  return mobile ?? desktop ?? null
}

function scrollToDefaultHour() {
  nextTick(() => scrollElementIntoContainer(gridScrollEl, visibleHourRowEl(DEFAULT_VISIBLE_HOUR)))
}

onMounted(scrollToDefaultHour)
watch(() => props.occurrences, scrollToDefaultHour)
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <button
      type="button"
      title="Previous day"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('prev')"
    >
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="text-sm font-medium text-foreground">{{
      formatDateLong(parseIsoDate(date))
    }}</span>
    <button
      type="button"
      title="Next day"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('next')"
    >
      <ChevronRight class="h-4 w-4" />
    </button>

    <select
      v-model="selectedCategoryId"
      class="ml-auto rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
    >
      <option value="ALL">All categories</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">
        {{ category.name }}
      </option>
    </select>
  </div>

  <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
  <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
  <p v-else-if="!categories.length" class="py-6 text-center text-sm text-muted">
    No categories yet — create one from the checklist page first.
  </p>

  <div
    v-else
    :ref="(el) => setGridScrollEl(el as Element | null)"
    class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface"
  >
    <!-- Mobile: una sola columna, tareas de todas las categorias visibles
           mezcladas por hora (sin separar en columnas). Respeta el mismo
           filtro que la vista de escritorio. -->
    <div class="divide-y divide-subtle sm:hidden">
      <div
        v-for="hour in HOURS"
        :key="hour"
        :ref="(el) => setMobileHourRowEl(hour, el as Element | null)"
        class="flex gap-2 p-2"
        :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
      >
        <div class="w-11 shrink-0 pt-0.5 text-right text-[10px] text-muted">
          {{ hourLabel(hour) }}
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <p v-if="!mobileOccurrencesFor(hour).length" class="text-[10px] text-muted/50">—</p>
          <div
            v-for="occurrence in mobileOccurrencesFor(hour)"
            :key="occurrence.id"
            class="min-w-0 cursor-pointer truncate rounded-md border border-subtle bg-background px-1.5 py-1 text-xs text-foreground"
            :title="occurrence.name"
            @click="emit('openDetail', occurrence)"
          >
            {{ occurrence.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop/tablet (sm+): una columna por categoria visible. Linea de
           tiempo continua: cada tarea se posiciona segun su hora de inicio
           y su duracion real (ver computeTimelineBlocks), en vez de ocupar
           todo el bloque de una hora. -->
    <div
      class="hidden text-sm sm:grid"
      :style="{
        gridTemplateColumns: `3.25rem repeat(${visibleCategories.length}, minmax(0, 1fr))`,
      }"
    >
      <div class="sticky top-0 z-10 border-b border-r border-subtle bg-surface"></div>
      <div
        v-for="category in visibleCategories"
        :key="category.id"
        class="sticky top-0 z-10 min-w-0 truncate border-b border-subtle bg-surface p-1.5 text-center text-xs font-semibold text-foreground sm:text-sm"
        :title="category.name"
      >
        {{ category.name }}
      </div>

      <!-- Columna de horas: una fila por hora, altura fija (para que
             calce en pixeles exactos con el overlay de cada categoria). -->
      <div>
        <div
          v-for="hour in HOURS"
          :key="hour"
          :ref="(el) => setDesktopHourRowEl(hour, el as Element | null)"
          :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
          class="border-b border-r border-subtle p-1 text-right text-[10px] text-muted sm:p-2 sm:text-xs"
          :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
        >
          {{ hourLabel(hour) }}
        </div>
      </div>

      <!-- Una columna por categoria: fondo con separadores de hora +
             overlay de tareas posicionadas por su horario real. -->
      <div v-for="category in visibleCategories" :key="category.id" class="relative min-w-0">
        <div
          v-for="hour in HOURS"
          :key="hour"
          :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
          class="border-b border-subtle"
          :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
        ></div>

        <div class="pointer-events-none absolute inset-0">
          <div
            v-for="block in dayTimelineBlocks(category.id)"
            :key="block.occurrence.id"
            class="pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden rounded-md border border-subtle bg-background px-1.5 py-1 text-xs"
            :style="{
              top: `${block.top}px`,
              height: `${block.height}px`,
              left: `${block.leftPercent}%`,
              width: `${block.widthPercent}%`,
            }"
            :title="block.occurrence.name"
            @click="emit('openDetail', block.occurrence)"
          >
            <span class="min-w-0 truncate text-foreground">{{ block.occurrence.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
