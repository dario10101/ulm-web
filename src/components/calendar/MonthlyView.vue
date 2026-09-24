<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from '@lucide/vue'
import { computed, watch } from 'vue'

import { useCategories } from '@/composables/useCategories'
import { formatDateLong, formatIsoDate, parseIsoDate, todayIsoDate } from '@/lib/date'
import {
  computeCellVisuals,
  computeMonthGridDays,
  eventColor,
  lastOfMonth,
  MONTH_NAMES,
  rangesCovering,
  WEEKDAY_LABELS,
  withAlpha,
  type MonthCellVisuals,
  type MonthGridDay,
} from '@/lib/monthGrid'
import { timeRangeLabel } from '@/lib/timeline'
import type { CalendarEventRange } from '@/types/calendarEvent'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Calendario clasico de lunes a domingo, con un panel lateral (no por celda)
 * para el detalle completo del dia seleccionado.
 */
const props = defineProps<{
  monthCursor: string
  occurrences: CalendarTaskOccurrence[]
  eventRanges: CalendarEventRange[]
  loading: boolean
  error: string | null
  hasCategories: boolean
  syncingTaskId: number | null
  syncResults: Record<number, { message: string; isError: boolean }>
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openDetail: [occurrence: CalendarTaskOccurrence]
  edit: [occurrence: CalendarTaskOccurrence]
  remove: [occurrence: CalendarTaskOccurrence]
  addToChecklist: [occurrence: CalendarTaskOccurrence]
}>()

const { categoryName } = useCategories()

const gridDays = computed<MonthGridDay[]>(() => computeMonthGridDays(props.monthCursor))

const monthLabel = computed(() => {
  const d = parseIsoDate(props.monthCursor)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
})

// Lo posee la pagina: "Today" debe poder reseleccionar el dia aunque el mes
// no cambie (y entonces el watch de abajo no se dispare).
const selectedDay = defineModel<string | null>('selectedDay', { required: true })

watch(
  () => props.monthCursor,
  (cursor) => {
    const today = todayIsoDate()
    selectedDay.value = today >= cursor && today <= lastOfMonth(cursor) ? today : null
  },
)

function occurrencesFor(dayIso: string): CalendarTaskOccurrence[] {
  return props.occurrences
    .filter((o) => formatIsoDate(new Date(o.occurrence_local)) === dayIso)
    .sort((a, b) => new Date(a.occurrence_local).getTime() - new Date(b.occurrence_local).getTime())
}

interface MonthDayEvent {
  key: string
  name: string
  detail: string | null
  label: 'Holiday' | 'Starts' | 'Ends' | null
  color: string
}

/**
 * A diferencia de los marcadores de la vista semanal (solo inicio/fin), aca un
 * evento aparece en el panel de CUALQUIER dia que cubra, con nombre y detalle
 * completos. El label solo marca los bordes: un dia intermedio no lleva label,
 * pero igual muestra la info.
 */
function eventsFor(dayIso: string): MonthDayEvent[] {
  return rangesCovering(props.eventRanges, dayIso).map((range) => {
    const isHoliday = range.code === 'HOLIDAY'
    const isStart = range.first_day === dayIso
    const isEnd = range.last_day === dayIso
    return {
      key: `${range.source}-${range.id}`,
      name: range.name,
      detail: range.detail,
      label: isHoliday
        ? 'Holiday'
        : isStart && isEnd
          ? null
          : isStart
            ? 'Starts'
            : isEnd
              ? 'Ends'
              : null,
      color: eventColor(range),
    }
  })
}

function cellVisuals(dayIso: string): MonthCellVisuals {
  return computeCellVisuals(rangesCovering(props.eventRanges, dayIso))
}

function selectDay(day: MonthGridDay) {
  if (!day.inMonth) return
  selectedDay.value = day.isoDate
}
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <button
      type="button"
      title="Previous month"
      class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
      @click="emit('prev')"
    >
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="text-sm font-medium text-foreground">{{ monthLabel }}</span>
    <button
      type="button"
      title="Next month"
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

  <div v-else class="flex flex-col gap-4 sm:flex-row">
    <div class="min-w-0 overflow-hidden rounded-xl border border-subtle bg-surface sm:flex-[2]">
      <div class="grid text-sm" style="grid-template-columns: repeat(7, minmax(0, 1fr))">
        <div
          v-for="label in WEEKDAY_LABELS"
          :key="label"
          class="border-b border-subtle p-1.5 text-center text-xs font-semibold text-foreground sm:text-sm"
        >
          {{ label }}
        </div>

        <button
          v-for="day in gridDays"
          :key="day.isoDate"
          type="button"
          :disabled="!day.inMonth"
          class="relative min-h-[3.25rem] min-w-0 space-y-1 border-b border-r border-subtle p-1 text-left align-top sm:min-h-[6rem] sm:p-1.5"
          :class="
            day.inMonth
              ? selectedDay === day.isoDate
                ? 'ring-2 ring-inset ring-accent-text'
                : ''
              : 'cursor-default opacity-30'
          "
          :style="
            day.inMonth && cellVisuals(day.isoDate).tintColor
              ? { backgroundColor: withAlpha(cellVisuals(day.isoDate).tintColor, '26') }
              : {}
          "
          @click="selectDay(day)"
        >
          <div
            v-if="day.inMonth && cellVisuals(day.isoDate).stripeColors.length"
            class="pointer-events-none absolute inset-y-0 left-0 flex"
          >
            <span
              v-for="(color, i) in cellVisuals(day.isoDate).stripeColors"
              :key="i"
              class="h-full w-1"
              :style="{ backgroundColor: color }"
            ></span>
          </div>

          <span
            class="relative inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs"
            :class="
              day.inMonth && day.isoDate === todayIsoDate()
                ? 'bg-accent font-semibold text-white'
                : 'text-muted'
            "
          >
            {{ day.dayNumber }}
          </span>

          <template v-if="day.inMonth">
            <div class="hidden space-y-0.5 sm:block">
              <p
                v-for="occurrence in occurrencesFor(day.isoDate).slice(0, 2)"
                :key="occurrence.id"
                class="flex items-center truncate rounded bg-background px-1 py-0.5 text-[10px] text-foreground"
              >
                {{ occurrence.name }}
              </p>
              <p v-if="occurrencesFor(day.isoDate).length > 2" class="text-[10px] text-muted">
                +{{ occurrencesFor(day.isoDate).length - 2 }} more
              </p>
            </div>
            <div
              v-if="occurrencesFor(day.isoDate).length"
              class="h-1.5 w-1.5 rounded-full bg-accent-text sm:hidden"
            ></div>
          </template>
        </button>
      </div>
    </div>

    <div class="min-w-0 rounded-xl border border-subtle bg-surface p-3 sm:flex-1">
      <p v-if="!selectedDay" class="text-sm text-muted">
        Select a day to see its tasks and events.
      </p>
      <template v-else>
        <h3 class="mb-3 text-sm font-semibold text-foreground">
          {{ formatDateLong(parseIsoDate(selectedDay)) }}
        </h3>

        <p
          v-if="!occurrencesFor(selectedDay).length && !eventsFor(selectedDay).length"
          class="text-sm text-muted"
        >
          Nothing scheduled for this day.
        </p>

        <div class="space-y-2">
          <div
            v-for="marker in eventsFor(selectedDay)"
            :key="marker.key"
            class="rounded-md border px-2 py-1.5 text-xs"
            :style="{
              backgroundColor: withAlpha(marker.color, '1a'),
              borderColor: withAlpha(marker.color, '66'),
            }"
          >
            <p class="font-medium text-foreground">
              <template v-if="marker.label">{{ marker.label }}: </template>{{ marker.name }}
            </p>
            <p v-if="marker.detail" class="mt-0.5 text-muted">{{ marker.detail }}</p>
          </div>

          <div
            v-for="occurrence in occurrencesFor(selectedDay)"
            :key="occurrence.id"
            class="min-w-0 rounded-md border border-subtle bg-background px-2 py-1.5 text-xs"
          >
            <p class="truncate text-[9px] uppercase tracking-wide text-accent-text">
              {{ categoryName(occurrence.category_id) }}
            </p>
            <div class="flex items-center gap-1">
              <span
                class="min-w-0 flex-1 cursor-pointer truncate text-foreground"
                :title="occurrence.name"
                @click="emit('openDetail', occurrence)"
              >
                {{ occurrence.name }}
              </span>
              <button
                type="button"
                title="Edit task"
                class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-foreground"
                @click="emit('edit', occurrence)"
              >
                <Pencil class="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Delete task"
                class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                @click="emit('remove', occurrence)"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
            <div class="mt-0.5 flex items-center justify-between gap-1">
              <span class="text-[10px] text-muted">{{ timeRangeLabel(occurrence) }}</span>
              <button
                v-if="!occurrence.add_to_checklist"
                type="button"
                :disabled="syncingTaskId === occurrence.id"
                class="shrink-0 text-[10px] text-accent-text hover:underline disabled:opacity-50"
                @click="emit('addToChecklist', occurrence)"
              >
                + Checklist
              </button>
            </div>
            <p
              v-if="syncResults[occurrence.id]"
              class="mt-0.5 text-[10px]"
              :class="syncResults[occurrence.id].isError ? 'text-ruby-text' : 'text-accent-text'"
            >
              {{ syncResults[occurrence.id].message }}
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
