<script setup lang="ts">
import { BookOpen, CalendarDays, Check, ListChecks, Scale, X } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuth } from '@/composables/useAuth'
import { recordTypes } from '@/config/recordTypes'
import { formatDateLong, formatIsoDate, isoWeekday, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { formatClock, parseLocalDateTime } from '@/lib/time'
import { listCalendarTasksForDay } from '@/services/calendarTasksApi'
import {
  getCurrentWeek,
  listCategories,
  listWeekTasks,
  updateTaskStatus,
} from '@/services/checklistsApi'
import { getDashboardToday } from '@/services/dashboardApi'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'
import type { Task, TaskStatus, Week } from '@/types/checklist'
import type { DashboardToday } from '@/types/dashboard'

// A partir de cuantos dias sin registrar se resalta el recordatorio.
const WEIGHT_STALE_DAYS = 7
const ENGLISH_STALE_DAYS = 3

const STATUS_ORDER: Record<TaskStatus, number> = { PENDING: 0, COMPLETE: 1, FAILED: 2 }

const { can } = useAuth()
const canPlan = can('planning')

const quickAddTypes = recordTypes.filter((type) => type.implemented && can(type.permission))

// Cada bloque carga y falla por separado: si una fuente cae, el resto sigue.
const today = ref<DashboardToday | null>(null)
const todayError = ref<string | null>(null)

const week = ref<Week | null>(null)
const checklistTasks = ref<Task[]>([])
const calendarTasks = ref<CalendarTaskOccurrence[]>([])
const tasksLoading = ref(canPlan)
const tasksError = ref<string | null>(null)

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

// "Hoy" del navegador, como en Today's checklist (ChecklistsPage).
const todayIso = formatIsoDate(new Date())

const weekCoversToday = computed(
  () => !!week.value && todayIso >= week.value.first_day && todayIso <= week.value.last_day,
)

const tasksForToday = computed(() =>
  checklistTasks.value
    .filter((task) => task.day_of_week === isoWeekday())
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.id - b.id),
)

const doneCount = computed(() => tasksForToday.value.filter((t) => t.status !== 'PENDING').length)

async function loadToday() {
  try {
    today.value = await getDashboardToday()
  } catch (err) {
    todayError.value = messageOf(err, 'Could not load today.')
  }
}

async function loadTasks() {
  try {
    const [categories, currentWeek, occurrences] = await Promise.all([
      listCategories(),
      getCurrentWeek(),
      listCalendarTasksForDay(todayIso),
    ])
    week.value = currentWeek
    calendarTasks.value = occurrences
    // Las tareas de categorias deshabilitadas no se muestran, igual que en el checklist.
    const enabled = new Set(categories.map((category) => category.id))
    const tasks = currentWeek ? await listWeekTasks(currentWeek.id) : []
    checklistTasks.value = tasks.filter((task) => enabled.has(task.category_id))
  } catch (err) {
    tasksError.value = messageOf(err, "Could not load today's tasks.")
  } finally {
    tasksLoading.value = false
  }
}

async function setStatus(task: Task, status: TaskStatus) {
  const nextStatus: TaskStatus = task.status === status ? 'PENDING' : status
  try {
    const updated = await updateTaskStatus(task.id, nextStatus)
    const index = checklistTasks.value.findIndex((t) => t.id === task.id)
    if (index !== -1) checklistTasks.value[index] = updated
  } catch (err) {
    tasksError.value = messageOf(err, 'Could not update the task.')
  }
}

function occurrenceTime(occurrence: CalendarTaskOccurrence): string {
  return formatClock(parseLocalDateTime(occurrence.occurrence_local))
}

// --- Recordatorios ---

function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()
  return Math.round(ms / 86_400_000)
}

function agoLabel(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

interface Reminder {
  id: string
  icon: typeof Scale
  text: string
  stale: boolean
  to: { name: string; params?: Record<string, string> }
  action: string
}

const reminders = computed<Reminder[]>(() => {
  const data = today.value
  if (!data) return []
  const items: Reminder[] = []
  if (data.weight) {
    const last = data.weight.last_recorded_on
    const days = last ? daysBetween(last, data.date) : null
    items.push({
      id: 'weight',
      icon: Scale,
      text:
        days === null
          ? 'No weight logged yet.'
          : `Last weigh-in ${agoLabel(days)} (${data.weight.last_kg} kg).`,
      stale: days === null || days >= WEIGHT_STALE_DAYS,
      to: { name: 'admin-quick-add', params: { type: 'weight' } },
      action: 'Log weight',
    })
  }
  if (data.english) {
    const last = data.english.last_practice_at
    const days = last ? daysBetween(formatIsoDate(new Date(last)), data.date) : null
    items.push({
      id: 'english',
      icon: BookOpen,
      text: days === null ? 'No English practice yet.' : `Last English practice ${agoLabel(days)}.`,
      stale: days === null || days >= ENGLISH_STALE_DAYS,
      to: { name: 'admin-english' },
      action: 'Practice',
    })
  }
  return items
})

onMounted(() => {
  loadToday()
  if (canPlan) loadTasks()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-sm font-medium text-foreground">
        {{ formatDateLong(parseIsoDate(today?.date ?? todayIso)) }}
      </p>
      <span
        v-for="event in today?.events ?? []"
        :key="`${event.source}-${event.id}`"
        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="
          event.source === 'event' ? 'bg-ruby/15 text-ruby-text' : 'bg-accent/15 text-accent-text'
        "
        :title="event.detail ?? undefined"
      >
        {{ event.name }}
      </span>
    </div>
    <p v-if="todayError" class="text-sm text-ruby-text">{{ todayError }}</p>

    <div class="grid gap-4 lg:grid-cols-3">
      <BaseCard v-if="canPlan" title="Today's tasks" class="lg:col-span-2">
        <template #actions>
          <span v-if="tasksForToday.length" class="text-xs text-muted">
            {{ doneCount }}/{{ tasksForToday.length }} done
          </span>
        </template>

        <p v-if="tasksLoading" class="text-sm text-muted">Loading...</p>
        <p v-else-if="tasksError" class="text-sm text-ruby-text">{{ tasksError }}</p>
        <div v-else class="space-y-4">
          <div>
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent-text">
              Checklist
            </p>
            <p v-if="!weekCoversToday" class="text-sm text-muted">
              No open checklist week covers today.
              <RouterLink
                :to="{ name: 'admin-checklists' }"
                class="text-accent-text hover:underline"
              >
                Go to checklist
              </RouterLink>
            </p>
            <p v-else-if="!tasksForToday.length" class="text-sm text-muted">No tasks for today.</p>
            <ul v-else class="space-y-1">
              <li
                v-for="task in tasksForToday"
                :key="task.id"
                data-test="today-task"
                class="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
                :class="{
                  'bg-success/15': task.status === 'COMPLETE',
                  'bg-ruby/15': task.status === 'FAILED',
                }"
              >
                <span
                  class="min-w-0 flex-1 truncate text-sm text-foreground"
                  :class="{ 'text-muted line-through': task.status !== 'PENDING' }"
                  :title="task.name"
                >
                  {{ task.name }}
                </span>
                <span class="shrink-0 text-xs text-muted">{{ task.points }} pt</span>
                <button
                  type="button"
                  title="Mark completed"
                  class="rounded p-1 transition-colors"
                  :class="
                    task.status === 'COMPLETE'
                      ? 'bg-success text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-success-text'
                  "
                  @click="setStatus(task, 'COMPLETE')"
                >
                  <Check class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Mark not achieved"
                  class="rounded p-1 transition-colors"
                  :class="
                    task.status === 'FAILED'
                      ? 'bg-ruby text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-ruby-text'
                  "
                  @click="setStatus(task, 'FAILED')"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent-text">
              Calendar
            </p>
            <p v-if="!calendarTasks.length" class="text-sm text-muted">Nothing scheduled.</p>
            <ul v-else class="space-y-1">
              <li
                v-for="occurrence in calendarTasks"
                :key="`${occurrence.id}-${occurrence.occurrence_at}`"
                class="flex items-center gap-2 px-1.5 py-1 text-sm"
              >
                <span class="w-16 shrink-0 text-xs text-muted">
                  {{ occurrenceTime(occurrence) }}
                </span>
                <span class="min-w-0 flex-1 truncate text-foreground">{{ occurrence.name }}</span>
              </li>
            </ul>
            <RouterLink
              :to="{ name: 'admin-calendar' }"
              class="mt-1 inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
            >
              <CalendarDays class="h-3.5 w-3.5" />
              Open calendar
            </RouterLink>
          </div>
        </div>
      </BaseCard>

      <div class="space-y-4">
        <BaseCard v-if="quickAddTypes.length" title="Quick add">
          <div class="grid grid-cols-2 gap-2">
            <RouterLink
              v-for="type in quickAddTypes"
              :key="type.id"
              :to="{ name: 'admin-quick-add', params: { type: type.id } }"
              class="flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm text-foreground transition-colors hover:border-accent-text/50 hover:bg-surface-hover"
            >
              <component :is="type.icon" class="h-4 w-4 text-accent-text" />
              {{ type.label }}
            </RouterLink>
          </div>
        </BaseCard>

        <BaseCard v-if="reminders.length" title="Reminders">
          <ul class="space-y-3">
            <li
              v-for="reminder in reminders"
              :key="reminder.id"
              :data-test="`reminder-${reminder.id}`"
              class="flex items-start gap-2 text-sm"
            >
              <component
                :is="reminder.icon"
                class="mt-0.5 h-4 w-4 shrink-0"
                :class="reminder.stale ? 'text-ruby-text' : 'text-muted'"
              />
              <div class="min-w-0 flex-1">
                <p :class="reminder.stale ? 'text-foreground' : 'text-muted'">
                  {{ reminder.text }}
                </p>
                <RouterLink :to="reminder.to" class="text-xs text-accent-text hover:underline">
                  {{ reminder.action }}
                </RouterLink>
              </div>
            </li>
          </ul>
        </BaseCard>
      </div>

      <BaseCard v-if="!canPlan && !quickAddTypes.length && !reminders.length" class="lg:col-span-3">
        <div class="flex items-center gap-2 text-sm text-muted">
          <ListChecks class="h-4 w-4" />
          Nothing to show yet: ask the administrator for access to a module.
        </div>
      </BaseCard>
    </div>
  </div>
</template>
