<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, nextTick, onMounted, watch } from 'vue'

import { addDays, formatDateLong, formatIsoDate, parseIsoDate, todayIsoDate } from '@/lib/date'
import { scrollElementIntoContainer } from '@/lib/dom'
import { WEEKDAY_LABELS } from '@/lib/monthGrid'
import {
  computeTimelineBlocks,
  DEFAULT_VISIBLE_HOUR,
  HOURS,
  HOUR_ROW_HEIGHT,
  hourLabel,
  type TimelineBlock,
} from '@/lib/timeline'
import type { CalendarEventMarker } from '@/types/calendarEvent'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Mismo concepto que la vista diaria, pero con el eje X en dias (Lunes a
 * Domingo) en vez de categorias.
 */
const props = defineProps<{
  weekStart: string
  occurrences: CalendarTaskOccurrence[]
  events: CalendarEventMarker[]
  loading: boolean
  error: string | null
  hasCategories: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openDetail: [occurrence: CalendarTaskOccurrence]
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

function eventsFor(dayIso: string): CalendarEventMarker[] {
  return props.events.filter((marker) => marker.marker_date === dayIso)
}

// La vista arranca mostrando las 8am, pero las horas anteriores siguen ahi
// arriba: alcanza con scrollear el cuadro (nunca la pagina completa).
let gridScrollEl: HTMLElement | null = null
const hourRowEls: Record<number, HTMLElement | null> = {}

function setGridScrollEl(el: Element | null) {
  gridScrollEl = el as HTMLElement | null
}

function setHourRowEl(hour: number, el: Element | null) {
  hourRowEls[hour] = el as HTMLElement | null
}

function scrollToDefaultHour() {
  nextTick(() => scrollElementIntoContainer(gridScrollEl, hourRowEls[DEFAULT_VISIBLE_HOUR]))
}

onMounted(scrollToDefaultHour)
watch(() => props.occurrences, scrollToDefaultHour)
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
      <div class="sticky top-0 z-10 border-b border-r border-subtle bg-surface"></div>
      <div
        v-for="(day, i) in weekDays"
        :key="i"
        class="sticky top-0 z-10 min-w-0 truncate border-b border-subtle p-1.5 text-center text-xs font-semibold sm:text-sm"
        :class="isTodayColumn(day) ? 'bg-accent/10 text-accent-text' : 'bg-surface text-foreground'"
      >
        {{ WEEKDAY_LABELS[i] }} {{ day.getDate() }}
      </div>

      <!-- Festivos y eventos (cld_events/cld_user_events): solo marcan el
           inicio y/o fin del rango, sin ninguna accion posible. -->
      <div class="border-b border-r border-subtle"></div>
      <div
        v-for="(day, i) in weekDays"
        :key="`ev-${i}`"
        class="min-h-[2rem] min-w-0 space-y-1 border-b border-subtle p-1"
        :class="isTodayColumn(day) ? 'bg-accent/10' : ''"
      >
        <div
          v-for="marker in eventsFor(formatIsoDate(day))"
          :key="`${marker.source}-${marker.id}-${marker.marker_type}`"
          :title="marker.detail || marker.name"
          class="truncate rounded-md border px-1.5 py-0.5 text-[10px]"
          :class="
            marker.code === 'HOLIDAY'
              ? 'border-accent/40 bg-accent/10 text-accent-text'
              : 'border-subtle bg-background text-muted'
          "
        >
          <template v-if="marker.marker_type === 'start'">▶ </template>
          <template v-else-if="marker.marker_type === 'end'">◀ </template>
          {{ marker.name }}
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
