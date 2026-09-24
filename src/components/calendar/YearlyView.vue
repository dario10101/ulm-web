<script setup lang="ts">
import { ChevronLeft, ChevronRight, ExternalLink } from '@lucide/vue'
import { ref } from 'vue'

import { formatIsoDate, todayIsoDate } from '@/lib/date'
import {
  computeCellVisuals,
  computeMonthGridDays,
  eventColor,
  MONTH_NAMES,
  rangesCovering,
  WEEKDAY_LABELS,
  withAlpha,
  type MonthCellVisuals,
  type MonthGridDay,
} from '@/lib/monthGrid'
import type { CalendarEventRange } from '@/types/calendarEvent'

/**
 * Los 12 meses del anio, compactos, coloreados igual que Monthly (misma
 * computeCellVisuals/eventColor). Sin edicion ni borrado: un click en
 * cualquier dia navega a Daily con esa fecha (tenga o no tareas/eventos), y el
 * boton de cada mes navega a Monthly.
 *
 * `ranges` llega ya filtrado por tipo de evento: el filtro vive en la barra de
 * herramientas de la pagina, no aca.
 */
const props = defineProps<{
  year: number
  ranges: CalendarEventRange[]
  loading: boolean
  error: string | null
  hasCategories: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openMonth: [monthIndex0: number]
  openDay: [isoDate: string]
}>()

function monthGridDays(monthIndex0: number): MonthGridDay[] {
  return computeMonthGridDays(formatIsoDate(new Date(props.year, monthIndex0, 1)))
}

function cellRangesFor(dayIso: string): CalendarEventRange[] {
  return rangesCovering(props.ranges, dayIso)
}

function cellVisuals(dayIso: string): MonthCellVisuals {
  return computeCellVisuals(cellRangesFor(dayIso))
}

function openDay(day: MonthGridDay) {
  if (!day.inMonth) return
  emit('openDay', day.isoDate)
}

// Hover de solo lectura: muestra los eventos/festivos de ese dia, cada uno con
// el mismo color que ya tiene en la celda. Las tareas no se muestran aca a
// proposito (solo eventos).
const hoveredDay = ref<string | null>(null)

function setHoveredDay(day: MonthGridDay) {
  hoveredDay.value = day.inMonth ? day.isoDate : null
}
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <button
      type="button"
      title="Previous year"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('prev')"
    >
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="text-sm font-medium text-foreground">{{ year }}</span>
    <button
      type="button"
      title="Next year"
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
    class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface p-3"
  >
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <div
        v-for="monthIndex in 12"
        :key="monthIndex"
        class="min-w-0 rounded-lg border border-subtle p-1.5"
      >
        <div class="mb-1 flex items-center justify-between">
          <span class="text-xs font-semibold text-foreground">{{
            MONTH_NAMES[monthIndex - 1]
          }}</span>
          <button
            type="button"
            title="Open month view"
            class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-foreground"
            @click="emit('openMonth', monthIndex - 1)"
          >
            <ExternalLink class="h-3 w-3" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-px">
          <span
            v-for="label in WEEKDAY_LABELS"
            :key="label"
            class="text-center text-[8px] font-medium text-muted"
          >
            {{ label[0] }}
          </span>

          <button
            v-for="day in monthGridDays(monthIndex - 1)"
            :key="day.isoDate"
            type="button"
            :disabled="!day.inMonth"
            class="relative aspect-square min-w-0 rounded text-[11px]"
            :class="day.inMonth ? '' : 'cursor-default opacity-30'"
            :style="
              day.inMonth && cellVisuals(day.isoDate).tintColor
                ? { backgroundColor: withAlpha(cellVisuals(day.isoDate).tintColor, '26') }
                : {}
            "
            @click="openDay(day)"
            @mouseenter="setHoveredDay(day)"
            @mouseleave="hoveredDay = null"
          >
            <div
              v-if="day.inMonth && cellVisuals(day.isoDate).stripeColors.length"
              class="pointer-events-none absolute inset-y-0 left-0 flex"
            >
              <span
                v-for="(color, i) in cellVisuals(day.isoDate).stripeColors"
                :key="i"
                class="h-full w-0.5"
                :style="{ backgroundColor: color }"
              ></span>
            </div>
            <span
              class="relative inline-flex h-full w-full items-center justify-center rounded"
              :class="
                day.inMonth && day.isoDate === todayIsoDate()
                  ? 'bg-accent font-semibold text-white'
                  : 'text-muted'
              "
            >
              {{ day.dayNumber }}
            </span>

            <div
              v-if="day.inMonth && hoveredDay === day.isoDate && cellRangesFor(day.isoDate).length"
              class="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-max max-w-[11rem] -translate-x-1/2 space-y-0.5 rounded-md border border-subtle bg-surface px-2 py-1.5 text-left shadow-lg"
            >
              <p
                v-for="range in cellRangesFor(day.isoDate)"
                :key="`${range.source}-${range.id}`"
                class="flex items-center gap-1.5 text-[10px] text-foreground"
              >
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: eventColor(range) }"
                ></span>
                <span class="truncate">{{ range.name }}</span>
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
