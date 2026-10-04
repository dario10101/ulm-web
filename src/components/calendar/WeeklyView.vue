<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, nextTick, watch } from 'vue'

import { addDays, formatDateLong, formatIsoDate, parseIsoDate, todayIsoDate } from '@/lib/date'
import { scrollElementIntoContainer, stickyInset } from '@/lib/dom'
import { eventColor, WEEKDAY_LABELS, withAlpha } from '@/lib/monthGrid'
import {
  computeTimelineBlocks,
  defaultVisibleHour,
  HOURS,
  HOUR_ROW_HEIGHT,
  hourLabel,
  type TimelineBlock,
} from '@/lib/timeline'
import { eventDateLabel, weekEventBars } from '@/lib/userEvents'
import type { CalendarEventRange } from '@/types/calendarEvent'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Mismo concepto que la vista diaria, pero con el eje X en dias (Lunes a
 * Domingo) en vez de categorias.
 */
const props = defineProps<{
  weekStart: string
  occurrences: CalendarTaskOccurrence[]
  /** Eventos que tocan la semana, con su rango completo (sin recortar). */
  events: CalendarEventRange[]
  loading: boolean
  error: string | null
  hasCategories: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openDetail: [occurrence: CalendarTaskOccurrence]
  openEvent: [event: CalendarEventRange]
}>()

const weekDays = computed(() => {
  const start = parseIsoDate(props.weekStart)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

function isTodayColumn(day: Date): boolean {
  return formatIsoDate(day) === todayIsoDate()
}

function timelineBlocksFor(dayIso: string): TimelineBlock[] {
  return computeTimelineBlocks(
    props.occurrences.filter((o) => formatIsoDate(new Date(o.occurrence_local)) === dayIso),
  )
}

/**
 * Los eventos no tienen hora: van en una fila "All day" fija debajo de los
 * dias. Uno de varios dias es una sola barra que cruza esas columnas (en vez de
 * repetirse en cada dia), y si sigue fuera de la semana lo indica con una
 * flecha en el borde.
 */
const eventBars = computed(() =>
  weekEventBars(
    props.events,
    weekDays.value.map((day) => formatIsoDate(day)),
  ),
)

// La vista arranca mostrando la hora actual (si la semana incluye hoy) para
// que se vea de entrada lo que falta del dia; las horas anteriores siguen ahi
// arriba, alcanza con scrollear el cuadro (nunca la pagina completa).
let gridScrollEl: HTMLElement | null = null
let allDayEl: HTMLElement | null = null
const hourRowEls: Record<number, HTMLElement | null> = {}

// El scroll inicial se dispara cuando aparece el grid, no cuando llegan los
// datos: mientras la vista muestra "Loading..." el grid no existe, y las
// ocurrencias se guardan un flush antes de que `loading` pase a false, asi que
// observarlas a ellas llega siempre demasiado pronto.
function setGridScrollEl(el: Element | null) {
  const next = el as HTMLElement | null
  // Vue reasigna el ref en cada render (null y de vuelta al mismo nodo): solo
  // interesa cuando el contenedor es realmente otro.
  if (!next || next === gridScrollEl) return
  gridScrollEl = next
  scrollToDefaultHour()
}

function setAllDayEl(el: Element | null) {
  allDayEl = el as HTMLElement | null
}

function setHourRowEl(hour: number, el: Element | null) {
  hourRowEls[hour] = el as HTMLElement | null
}

const weekIncludesToday = computed(() => weekDays.value.some((day) => isTodayColumn(day)))

function scrollToDefaultHour() {
  const hour = defaultVisibleHour(weekIncludesToday.value)
  // Los encabezados y la fila "All day" quedan pegados arriba: se descuentan
  // para que la hora actual quede justo debajo, no tapada por ellos.
  nextTick(() =>
    scrollElementIntoContainer(gridScrollEl, hourRowEls[hour], stickyInset(gridScrollEl, allDayEl)),
  )
}

watch(() => props.weekStart, scrollToDefaultHour)
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <button
      type="button"
      title="Previous week"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('prev')"
    >
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="text-sm font-medium text-foreground">
      {{ formatDateLong(weekDays[0]) }} – {{ formatDateLong(weekDays[6]) }}
    </span>
    <button
      type="button"
      title="Next week"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('next')"
    >
      <ChevronRight class="h-4 w-4" />
    </button>
  </div>

  <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
  <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
  <p v-else-if="!hasCategories" class="py-6 text-center text-sm text-muted">
    No categories yet — create one from the checklist page first.
  </p>

  <div
    v-else
    :ref="(el) => setGridScrollEl(el as Element | null)"
    class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface"
  >
    <div class="grid text-sm" style="grid-template-columns: 3.25rem repeat(7, minmax(0, 1fr))">
      <!-- Encabezados con alto fijo (h-9): la fila "All day" se pega justo
           debajo (top-9). Fondo opaco + tinte interno, para que lo que pasa
           por debajo al scrollear no se transparente en la columna de hoy. -->
      <div class="sticky top-0 z-10 h-9 border-b border-r border-subtle bg-surface"></div>
      <div
        v-for="(day, i) in weekDays"
        :key="i"
        class="sticky top-0 z-10 h-9 min-w-0 border-b border-subtle bg-surface text-xs font-semibold sm:text-sm"
      >
        <div
          class="h-full truncate px-1.5 text-center leading-9"
          :class="isTodayColumn(day) ? 'bg-accent/10 text-accent-text' : 'text-foreground'"
        >
          {{ WEEKDAY_LABELS[i] }} {{ day.getDate() }}
        </div>
      </div>

      <div
        class="sticky top-9 z-10 flex items-start justify-end border-b border-r border-subtle bg-surface p-1 text-right text-[10px] leading-tight text-muted"
      >
        All day
      </div>
      <div
        :ref="(el) => setAllDayEl(el as Element | null)"
        class="sticky top-9 z-10 col-span-7 border-b border-subtle bg-surface"
      >
        <div class="relative">
          <div class="pointer-events-none absolute inset-0 grid grid-cols-7">
            <div
              v-for="(day, i) in weekDays"
              :key="`tint-${i}`"
              :class="isTodayColumn(day) ? 'bg-accent/10' : ''"
            ></div>
          </div>
          <div class="relative grid min-h-[2rem] grid-flow-row-dense grid-cols-7 gap-y-1 py-1">
            <button
              v-for="bar in eventBars"
              :key="`${bar.range.source}-${bar.range.id}`"
              type="button"
              :title="`${bar.range.name} · ${eventDateLabel(bar.range)}`"
              class="mx-0.5 flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] hover:brightness-95"
              :style="{
                gridColumn: `${bar.startColumn + 1} / ${bar.endColumn + 2}`,
                backgroundColor: withAlpha(eventColor(bar.range), '26'),
                borderColor: withAlpha(eventColor(bar.range), '66'),
              }"
              @click="emit('openEvent', bar.range)"
            >
              <span v-if="bar.continuesBefore" class="shrink-0 text-muted">◀</span>
              <span class="min-w-0 flex-1 truncate text-foreground">{{ bar.range.name }}</span>
              <span v-if="bar.continuesAfter" class="shrink-0 text-muted">▶</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Columna de horas: una fila por hora, altura fija (calza en pixeles
           exactos con el overlay de cada dia). -->
      <div class="border-r border-subtle">
        <div
          v-for="hour in HOURS"
          :key="hour"
          :ref="(el) => setHourRowEl(hour, el as Element | null)"
          :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
          class="border-b border-subtle p-1 text-right text-[10px] text-muted sm:p-2 sm:text-xs"
        >
          {{ hourLabel(hour) }}
        </div>
      </div>

      <!-- Un dia por columna: fondo con separadores de hora + overlay de
           tareas posicionadas por su horario real. -->
      <div
        v-for="(day, i) in weekDays"
        :key="`d-${i}`"
        class="relative min-w-0"
        :class="isTodayColumn(day) ? 'bg-accent/10' : ''"
      >
        <div
          v-for="hour in HOURS"
          :key="hour"
          :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
          class="border-b border-subtle"
        ></div>

        <div class="pointer-events-none absolute inset-0">
          <div
            v-for="block in timelineBlocksFor(formatIsoDate(day))"
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
