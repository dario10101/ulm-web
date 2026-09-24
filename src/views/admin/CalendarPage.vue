<script setup lang="ts">
import { ChevronDown, Plus } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import DailyView from '@/components/calendar/DailyView.vue'
import DeleteTaskDialog from '@/components/calendar/DeleteTaskDialog.vue'
import TaskDetailDialog from '@/components/calendar/TaskDetailDialog.vue'
import TaskEditDialog from '@/components/calendar/TaskEditDialog.vue'
import TaskFormDialog from '@/components/calendar/TaskFormDialog.vue'
import EventTypeFilter from '@/components/calendar/EventTypeFilter.vue'
import MonthlyView from '@/components/calendar/MonthlyView.vue'
import WeeklyView from '@/components/calendar/WeeklyView.vue'
import YearlyView from '@/components/calendar/YearlyView.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { addDays, formatIsoDate, parseIsoDate, todayIsoDate } from '@/lib/date'
import { useCalendarSection } from '@/composables/useCalendarSection'
import { useCategories } from '@/composables/useCategories'
import { allEventTypes, normalizedEventCode, type EventTypeValue } from '@/lib/eventTypes'
import { firstOfMonth, lastOfMonth, mondayOf } from '@/lib/monthGrid'
import { ApiError } from '@/lib/http'
import { listCalendarEventRanges, listCalendarEvents } from '@/services/calendarEventsApi'
import {
  enableCalendarTaskChecklistSync,
  listCalendarTasksForDay,
  listCalendarTasksForRange,
} from '@/services/calendarTasksApi'
import type { CalendarEventMarker, CalendarEventRange } from '@/types/calendarEvent'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

// --- Selector de vista (Daily/Weekly/Monthly/Yearly). Monthly es la vista
// por defecto (ver viewMode mas abajo). ---

type ViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const { categories, ensureLoaded: ensureCategoriesLoaded } = useCategories()

const viewMode = ref<ViewMode>('MONTHLY')
const viewMenuOpen = ref(false)

function viewLabel(mode: ViewMode): string {
  return VIEW_OPTIONS.find((option) => option.value === mode)?.label ?? ''
}

function selectView(mode: ViewMode) {
  viewMode.value = mode
  viewMenuOpen.value = false
}

// --- Vista diaria: grilla categorias (columnas) x horas (filas, 5am-12am) ---

const currentDate = ref(todayIsoDate())
const occurrences = ref<CalendarTaskOccurrence[]>([])

function goToPreviousDay() {
  currentDate.value = formatIsoDate(addDays(parseIsoDate(currentDate.value), -1))
}

function goToNextDay() {
  currentDate.value = formatIsoDate(addDays(parseIsoDate(currentDate.value), 1))
}

function goToToday() {
  currentDate.value = todayIsoDate()
  weekStart.value = mondayOf(todayIsoDate())
  monthCursor.value = firstOfMonth(todayIsoDate())
  selectedDay.value = todayIsoDate()
  yearCursor.value = new Date().getFullYear()
}

const {
  loading,
  error: loadError,
  reload: loadDay,
  ensureLoaded: ensureDayLoaded,
  reloadIfLoaded: reloadDayIfLoaded,
} = useCalendarSection(async () => {
  occurrences.value = await listCalendarTasksForDay(currentDate.value)
}, 'Could not load this day.')

watch(currentDate, reloadDayIfLoaded)
onMounted(() => {
  ensureCategoriesLoaded()
  if (viewMode.value === 'DAILY') ensureDayLoaded()
  else if (viewMode.value === 'WEEKLY') ensureWeekLoaded()
  else if (viewMode.value === 'MONTHLY') ensureMonthLoaded()
  else if (viewMode.value === 'YEARLY') ensureYearLoaded()
})

// --- Vista semanal: mismo concepto, eje X = dias Lunes..Domingo en vez de
// categorias. Reusa detalle/edicion/borrado/alta-al-checklist tal cual estan
// definidos mas abajo (son agnosticos a que grilla los invoco). ---

const weekStart = ref(mondayOf(todayIsoDate()))

const weekOccurrences = ref<CalendarTaskOccurrence[]>([])
const weekEvents = ref<CalendarEventMarker[]>([])

function goToPreviousWeek() {
  weekStart.value = formatIsoDate(addDays(parseIsoDate(weekStart.value), -7))
}

function goToNextWeek() {
  weekStart.value = formatIsoDate(addDays(parseIsoDate(weekStart.value), 7))
}

const {
  loading: weekLoading,
  error: weekLoadError,
  reload: loadWeek,
  ensureLoaded: ensureWeekLoaded,
  reloadIfLoaded: reloadWeekIfLoaded,
} = useCalendarSection(async () => {
  const start = weekStart.value
  const end = formatIsoDate(addDays(parseIsoDate(start), 6))
  const [tasks, events] = await Promise.all([
    listCalendarTasksForRange(start, end),
    listCalendarEvents(start, end),
  ])
  weekOccurrences.value = tasks
  weekEvents.value = events
}, 'Could not load this week.')

watch(viewMode, (mode) => {
  if (mode === 'DAILY') ensureDayLoaded()
  if (mode === 'WEEKLY') ensureWeekLoaded()
  if (mode === 'MONTHLY') ensureMonthLoaded()
  if (mode === 'YEARLY') ensureYearLoaded()
})
watch(weekStart, reloadWeekIfLoaded)

async function refreshCurrentView() {
  if (viewMode.value === 'WEEKLY') await loadWeek()
  else if (viewMode.value === 'MONTHLY') await loadMonth()
  else if (viewMode.value === 'YEARLY') await loadYear()
  else await loadDay()
}

// --- Vista mensual: calendario clasico Lunes..Domingo, con un panel lateral
// (no por celda) para el detalle completo del dia seleccionado. Reusa
// integramente detalle/edicion/borrado/alta-al-checklist definidos mas abajo. ---

const monthCursor = ref(firstOfMonth(todayIsoDate()))
const selectedDay = ref<string | null>(todayIsoDate())
const monthOccurrences = ref<CalendarTaskOccurrence[]>([])
const monthEventRanges = ref<CalendarEventRange[]>([])

function goToPreviousMonth() {
  const d = parseIsoDate(monthCursor.value)
  monthCursor.value = formatIsoDate(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

function goToNextMonth() {
  const d = parseIsoDate(monthCursor.value)
  monthCursor.value = formatIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

const {
  loading: monthLoading,
  error: monthLoadError,
  reload: loadMonth,
  ensureLoaded: ensureMonthLoaded,
  reloadIfLoaded: reloadMonthIfLoaded,
} = useCalendarSection(async () => {
  const start = monthCursor.value
  const end = lastOfMonth(start)
  const [tasks, ranges] = await Promise.all([
    listCalendarTasksForRange(start, end),
    listCalendarEventRanges(start, end),
  ])
  monthOccurrences.value = tasks
  monthEventRanges.value = ranges
}, 'Could not load this month.')

watch(monthCursor, reloadMonthIfLoaded)

function openMonthFromYear(monthIndex0: number) {
  monthCursor.value = formatIsoDate(new Date(yearCursor.value, monthIndex0, 1))
  viewMode.value = 'MONTHLY'
}

// --- Vista anual: los 12 meses del anio, compactos, coloreados igual que
// Monthly (misma computeCellVisuals/eventColor), sin edicion/borrado ni
// hover: un click en cualquier dia navega a Daily con esa fecha (tenga o no
// tareas/eventos), y el boton de cada mes navega a Monthly. ---

const yearCursor = ref(new Date().getFullYear())
const yearEventRanges = ref<CalendarEventRange[]>([])

// El filtro en si vive en EventTypeFilter.vue (barra de herramientas); aca
// queda solo el estado, porque es lo que filtra los rangos de la vista anual.
const selectedEventTypes = ref<Set<EventTypeValue>>(allEventTypes())

function goToPreviousYear() {
  yearCursor.value -= 1
}

function goToNextYear() {
  yearCursor.value += 1
}

function goToDayFromYear(isoDate: string) {
  currentDate.value = isoDate
  viewMode.value = 'DAILY'
}

const visibleYearRanges = computed(() =>
  yearEventRanges.value.filter((range) => selectedEventTypes.value.has(normalizedEventCode(range))),
)

const {
  loading: yearLoading,
  error: yearLoadError,
  reload: loadYear,
  ensureLoaded: ensureYearLoaded,
  reloadIfLoaded: reloadYearIfLoaded,
} = useCalendarSection(async () => {
  yearEventRanges.value = await listCalendarEventRanges(
    `${yearCursor.value}-01-01`,
    `${yearCursor.value}-12-31`,
  )
}, 'Could not load this year.')

watch(yearCursor, reloadYearIfLoaded)

// --- Agregar tarea: misma funcionalidad que "Add record" > Task (ver
// QuickAddPage.vue), pero accesible directo desde el calendario, al lado de
// "Today", en las 4 vistas. La fecha por defecto depende de donde este
// parado el usuario: en Daily, el dia que esta viendo; en Weekly/Monthly/
// Yearly, la primera fecha de ese periodo que sea >= manana (si el periodo
// entero ya paso, se usa igual su primer dia, sin importar la regla de
// "manana"). ---

function firstAvailableDateFor(periodStart: string, periodEnd: string): string {
  const tomorrow = formatIsoDate(addDays(parseIsoDate(todayIsoDate()), 1))
  const candidate = tomorrow > periodStart ? tomorrow : periodStart
  return candidate > periodEnd ? periodStart : candidate
}

function defaultAddTaskDate(): string {
  if (viewMode.value === 'DAILY') return currentDate.value
  if (viewMode.value === 'WEEKLY') {
    return firstAvailableDateFor(
      weekStart.value,
      formatIsoDate(addDays(parseIsoDate(weekStart.value), 6)),
    )
  }
  if (viewMode.value === 'MONTHLY') {
    return firstAvailableDateFor(monthCursor.value, lastOfMonth(monthCursor.value))
  }
  return firstAvailableDateFor(`${yearCursor.value}-01-01`, `${yearCursor.value}-12-31`)
}

// El formulario vive en TaskFormDialog; aca solo si esta abierto.
const addTaskOpen = ref(false)

function openAddTask() {
  addTaskOpen.value = true
}

async function onTaskCreated() {
  addTaskOpen.value = false
  await refreshCurrentView()
}

// Que tarea tiene el detalle abierto. El contenido del dialogo vive en
// TaskDetailDialog; aca solo se controla si esta abierto y sobre que tarea.
const detailTask = ref<CalendarTaskOccurrence | null>(null)

function openDetail(occurrence: CalendarTaskOccurrence) {
  detailTask.value = occurrence
}

// Cierran el detalle antes de abrir edicion/borrado para no apilar modales.
function editFromDetail(occurrence: CalendarTaskOccurrence) {
  detailTask.value = null
  openEdit(occurrence)
}

function deleteFromDetail(occurrence: CalendarTaskOccurrence) {
  detailTask.value = null
  openDeleteConfirm(occurrence)
}

// Tarea en edicion; el formulario vive en TaskEditDialog.
const editingTask = ref<CalendarTaskOccurrence | null>(null)

function openEdit(occurrence: CalendarTaskOccurrence) {
  editingTask.value = occurrence
}

async function onTaskSaved() {
  editingTask.value = null
  await refreshCurrentView()
}

// Tarea pendiente de confirmar borrado; el dialogo vive en DeleteTaskDialog.
const deleteTarget = ref<CalendarTaskOccurrence | null>(null)

function openDeleteConfirm(occurrence: CalendarTaskOccurrence) {
  deleteTarget.value = occurrence
}

async function onTaskDeleted() {
  deleteTarget.value = null
  await refreshCurrentView()
}

// --- Alta retroactiva al checklist semanal ---

const syncingTaskId = ref<number | null>(null)
const syncResults = ref<Record<number, { message: string; isError: boolean }>>({})

async function addToChecklist(occurrence: CalendarTaskOccurrence) {
  syncingTaskId.value = occurrence.id
  try {
    const occurrenceDate = formatIsoDate(new Date(occurrence.occurrence_local))
    const result = await enableCalendarTaskChecklistSync(occurrence.id, occurrenceDate)
    occurrence.add_to_checklist = true
    syncResults.value[occurrence.id] = {
      message: result.added_to_current_week
        ? "Added to this week's checklist."
        : 'Saved — this will be added once a week covers this date.',
      isError: false,
    }
  } catch (err) {
    syncResults.value[occurrence.id] = {
      message: err instanceof ApiError ? err.message : 'Could not add this to the checklist.',
      isError: true,
    }
  } finally {
    syncingTaskId.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:h-[calc(100vh-6.5rem)]">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Calendar</h1>
        <p class="text-sm text-muted">Your calendar tasks, laid out by category and hour.</p>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" type="button" @click="goToToday">Today</BaseButton>
        <BaseButton variant="primary" type="button" @click="openAddTask">
          <Plus class="h-4 w-4" />
          Add task
        </BaseButton>

        <EventTypeFilter v-if="viewMode === 'YEARLY'" v-model="selectedEventTypes" />

        <div class="relative">
          <BaseButton variant="secondary" type="button" @click="viewMenuOpen = !viewMenuOpen">
            {{ viewLabel(viewMode) }}
            <ChevronDown class="h-4 w-4" />
          </BaseButton>
          <div v-if="viewMenuOpen" class="fixed inset-0 z-10" @click="viewMenuOpen = false" />
          <div
            v-if="viewMenuOpen"
            class="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-subtle bg-surface py-1 shadow-lg"
          >
            <button
              v-for="option in VIEW_OPTIONS"
              :key="option.value"
              type="button"
              class="block w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
              :class="
                viewMode === option.value ? 'font-medium text-accent-text' : 'text-foreground'
              "
              @click="selectView(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <DailyView
      v-if="viewMode === 'DAILY'"
      :date="currentDate"
      :occurrences="occurrences"
      :loading="loading"
      :error="loadError"
      @prev="goToPreviousDay"
      @next="goToNextDay"
      @open-detail="openDetail"
    />

    <WeeklyView
      v-else-if="viewMode === 'WEEKLY'"
      :week-start="weekStart"
      :occurrences="weekOccurrences"
      :events="weekEvents"
      :loading="weekLoading"
      :error="weekLoadError"
      :has-categories="categories.length > 0"
      @prev="goToPreviousWeek"
      @next="goToNextWeek"
      @open-detail="openDetail"
    />

    <MonthlyView
      v-else-if="viewMode === 'MONTHLY'"
      v-model:selected-day="selectedDay"
      :month-cursor="monthCursor"
      :occurrences="monthOccurrences"
      :event-ranges="monthEventRanges"
      :loading="monthLoading"
      :error="monthLoadError"
      :has-categories="categories.length > 0"
      :syncing-task-id="syncingTaskId"
      :sync-results="syncResults"
      @prev="goToPreviousMonth"
      @next="goToNextMonth"
      @open-detail="openDetail"
      @edit="openEdit"
      @remove="openDeleteConfirm"
      @add-to-checklist="addToChecklist"
    />

    <YearlyView
      v-else-if="viewMode === 'YEARLY'"
      :year="yearCursor"
      :ranges="visibleYearRanges"
      :loading="yearLoading"
      :error="yearLoadError"
      :has-categories="categories.length > 0"
      @prev="goToPreviousYear"
      @next="goToNextYear"
      @open-month="openMonthFromYear"
      @open-day="goToDayFromYear"
    />

    <TaskDetailDialog
      :task="detailTask"
      :syncing-task-id="syncingTaskId"
      :sync-results="syncResults"
      @close="detailTask = null"
      @edit="editFromDetail"
      @remove="deleteFromDetail"
      @add-to-checklist="addToChecklist"
    />

    <TaskEditDialog :task="editingTask" @close="editingTask = null" @saved="onTaskSaved" />

    <TaskFormDialog
      :open="addTaskOpen"
      :default-date="defaultAddTaskDate()"
      @close="addTaskOpen = false"
      @saved="onTaskCreated"
    />

    <DeleteTaskDialog :task="deleteTarget" @close="deleteTarget = null" @deleted="onTaskDeleted" />
  </div>
</template>
