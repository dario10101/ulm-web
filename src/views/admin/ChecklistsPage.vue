<script setup lang="ts">
import {
  BarChart3,
  Check,
  Copy,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  Settings,
  Table2,
  Trash2,
  X,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  closeWeek,
  createWeek,
  createWeekTask,
  deleteTask,
  getCurrentWeek,
  getNextWeekRange,
  listCategories,
  listWeekTasks,
  updateTask,
  updateTaskStatus,
} from '@/services/checklistsApi'
import {
  addDays,
  formatDateLong,
  formatIsoDate,
  isoWeekday,
  parseIsoDate,
  todayIsoDate,
} from '@/lib/date'
import { ApiError } from '@/lib/http'
import type { Category, Importance, Task, TaskStatus, Week, WeekRange } from '@/types/checklist'

// Orden dentro de cada seccion: sin marcar (por orden de creacion), despues
// completadas, despues no logradas.
const STATUS_ORDER: Record<TaskStatus, number> = { PENDING: 0, COMPLETE: 1, FAILED: 2 }

type PageMode = 'TRACK' | 'EDIT'
const mode = ref<PageMode>('TRACK')

function toggleMode() {
  mode.value = mode.value === 'TRACK' ? 'EDIT' : 'TRACK'
}

// Mismo dia 1=Lunes...7=Domingo usado en el template (ver TemplateAdminPage.vue)
const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const categories = ref<Category[]>([])
const week = ref<Week | null>(null)
const tasks = ref<Task[]>([])
const activeDay = ref(isoWeekday())

const loading = ref(false)
const error = ref<string | null>(null)
const closing = ref(false)

const tasksForActiveDay = computed(() =>
  tasks.value.filter((t) => t.day_of_week === activeDay.value),
)
const activeDayLabel = computed(() => DAYS.find((d) => d.value === activeDay.value)?.label ?? '')

// Las pestanas arrancan en el dia en que empieza la semana (first_day), no
// siempre en Lunes: si la semana va de miercoles a martes, se muestran en
// ese orden (Wed, Thu, Fri, Sat, Sun, Mon, Tue).
const orderedDays = computed(() => {
  if (!week.value) return DAYS
  const startWeekday = isoWeekday(parseIsoDate(week.value.first_day))
  const startIndex = DAYS.findIndex((d) => d.value === startWeekday)
  return [...DAYS.slice(startIndex), ...DAYS.slice(0, startIndex)]
})

// Dia de hoy dentro de la semana mostrada, solo si su rango realmente cubre
// la fecha de hoy (una semana vencida no marca ningun tab como "hoy").
const todayDay = computed(() => {
  if (!week.value) return null
  const today = todayIsoDate()
  const inRange = today >= week.value.first_day && today <= week.value.last_day
  return inRange ? isoWeekday() : null
})

function dayTabTextClass(day: { value: number }): string {
  if (day.value === todayDay.value) return 'text-accent-text font-semibold'
  return activeDay.value === day.value ? 'text-foreground' : 'text-muted'
}

// orderedDays ya viene en orden calendario a partir de first_day, asi que el
// indice dentro de esa lista es directamente el desplazamiento en dias.
function dayTabDate(index: number): string | undefined {
  if (!week.value) return undefined
  return formatDateLong(addDays(parseIsoDate(week.value.first_day), index))
}

function tasksFor(categoryId: number, importance: Importance): Task[] {
  return tasksForActiveDay.value
    .filter((t) => t.category_id === categoryId && t.importance === importance)
    .slice()
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.id - b.id)
}

function totalFor(categoryId: number): number {
  return tasksForActiveDay.value
    .filter((t) => t.category_id === categoryId)
    .reduce((sum, t) => sum + t.points, 0)
}

const pendingCount = computed(() => tasks.value.filter((t) => t.status === 'PENDING').length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [categoriesResponse, weekResponse] = await Promise.all([
      listCategories(),
      getCurrentWeek(),
    ])
    categories.value = categoriesResponse
    week.value = weekResponse
    tasks.value = weekResponse ? await listWeekTasks(weekResponse.id) : []
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load this week.'
  } finally {
    loading.value = false
  }
}

async function setStatus(task: Task, status: TaskStatus) {
  const nextStatus: TaskStatus = task.status === status ? 'PENDING' : status
  try {
    const updated = await updateTaskStatus(task.id, nextStatus)
    const index = tasks.value.findIndex((t) => t.id === task.id)
    if (index !== -1) tasks.value[index] = updated
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not update the task.'
  }
}

// --- Alta/edicion de tareas de la semana en curso ---
// Alta: tarea circunstancial agregada directo a la semana, no toca el template.
// Edicion (modo Edit): mismo modal, precargado con los valores actuales.

interface TaskFormState {
  formMode: 'create' | 'edit'
  taskId: number | null
  name: string
  importance: Importance
  categoryId: number | null
  detail: string
}

const taskFormOpen = ref(false)
const taskFormSaving = ref(false)
const taskFormError = ref<string | null>(null)
const taskForm = ref<TaskFormState>({
  formMode: 'create',
  taskId: null,
  name: '',
  importance: 'STANDARD',
  categoryId: null,
  detail: '',
})

function openCreateTaskForm(categoryId: number, importance: Importance) {
  taskForm.value = {
    formMode: 'create',
    taskId: null,
    name: '',
    importance,
    categoryId,
    detail: '',
  }
  taskFormError.value = null
  taskFormOpen.value = true
}

function openEditTaskForm(task: Task) {
  taskForm.value = {
    formMode: 'edit',
    taskId: task.id,
    name: task.name,
    importance: task.importance,
    categoryId: task.category_id,
    detail: task.detail ?? '',
  }
  taskFormError.value = null
  taskFormOpen.value = true
}

function closeTaskForm() {
  taskFormOpen.value = false
}

async function submitTaskForm() {
  const name = taskForm.value.name.trim()
  if (!name || !taskForm.value.categoryId) {
    taskFormError.value = 'Name and category are required.'
    return
  }

  taskFormSaving.value = true
  taskFormError.value = null
  try {
    const detail = taskForm.value.detail.trim() || null
    if (taskForm.value.formMode === 'create') {
      if (!week.value) return
      const created = await createWeekTask(week.value.id, {
        name,
        importance: taskForm.value.importance,
        category_id: taskForm.value.categoryId,
        day_of_week: activeDay.value,
        detail,
      })
      tasks.value.push(created)
    } else if (taskForm.value.taskId !== null) {
      const updated = await updateTask(taskForm.value.taskId, {
        name,
        importance: taskForm.value.importance,
        category_id: taskForm.value.categoryId,
        detail,
      })
      const index = tasks.value.findIndex((t) => t.id === updated.id)
      if (index !== -1) tasks.value[index] = updated
    }
    closeTaskForm()
  } catch (err) {
    taskFormError.value = err instanceof ApiError ? err.message : 'Could not save the task.'
  } finally {
    taskFormSaving.value = false
  }
}

async function handleDeleteTask(task: Task) {
  error.value = null
  try {
    await deleteTask(task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not delete the task.'
  }
}

// --- Ver detalle de una tarea (solo modo Track) ---

const detailModalTask = ref<Task | null>(null)
const detailCopyLabel = ref('Copy')

function openDetailModal(task: Task) {
  if (mode.value !== 'TRACK') return
  detailCopyLabel.value = 'Copy'
  detailModalTask.value = task
}

function closeDetailModal() {
  detailModalTask.value = null
}

async function copyDetail() {
  if (!detailModalTask.value?.detail) return
  try {
    await navigator.clipboard.writeText(detailModalTask.value.detail)
    detailCopyLabel.value = 'Copied!'
  } catch {
    detailCopyLabel.value = 'Could not copy'
  }
}

async function handleCloseWeek() {
  if (!week.value) return
  if (pendingCount.value > 0) {
    error.value = `You still have ${pendingCount.value} pending task(s). Mark them completed or not achieved before closing the week.`
    return
  }
  if (
    !window.confirm('Close this week? Its score will be locked in and tasks can no longer change.')
  ) {
    return
  }
  closing.value = true
  error.value = null
  try {
    await closeWeek(week.value.id)
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not close the week.'
  } finally {
    closing.value = false
  }
}

// --- Modal para crear la semana ---

const createModalOpen = ref(false)
const createForm = ref({ firstDay: '', lastDay: '' })
const createSaving = ref(false)
const createError = ref<string | null>(null)
const nextRange = ref<WeekRange | null>(null)

// Validacion en espejo de WeekService.get_next_range/create_week en el
// backend (fuente de verdad): rango de a lo sumo 7 dias, que no se solape con
// la semana anterior, y que no termine antes de hoy.
const rangeError = computed(() => {
  const { firstDay, lastDay } = createForm.value
  if (!firstDay || !lastDay) return 'Start and end date are required.'

  const spanDays = Math.round(
    (parseIsoDate(lastDay).getTime() - parseIsoDate(firstDay).getTime()) / 86_400_000,
  )
  if (spanDays < 0 || spanDays > 6) return 'The range must cover at most 7 days.'

  if (nextRange.value && lastDay < nextRange.value.min_last_day) {
    return `The end date cannot be before ${nextRange.value.min_last_day}.`
  }
  if (nextRange.value && firstDay < nextRange.value.min_first_day) {
    return `The start date cannot be before ${nextRange.value.min_first_day} (right after the previous week).`
  }
  return null
})

async function openCreateModal() {
  createError.value = null
  createModalOpen.value = true
  nextRange.value = await getNextWeekRange().catch(() => null)

  const minFirstDay = nextRange.value?.min_first_day ?? formatIsoDate(new Date())
  createForm.value = {
    firstDay: minFirstDay,
    lastDay: formatIsoDate(addDays(parseIsoDate(minFirstDay), 6)),
  }
}

function closeCreateModal() {
  createModalOpen.value = false
}

async function submitCreateWeek() {
  if (rangeError.value) {
    createError.value = rangeError.value
    return
  }
  createSaving.value = true
  createError.value = null
  try {
    await createWeek({ first_day: createForm.value.firstDay, last_day: createForm.value.lastDay })
    closeCreateModal()
    await load()
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : 'Could not create the week.'
  } finally {
    createSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-6 sm:h-[calc(100vh-6.5rem)]">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Today's checklist</h1>
        <p class="text-sm text-muted">
          {{
            mode === 'TRACK'
              ? 'Tap the check or the cross to mark a task, no extra steps.'
              : 'Edit mode: tap the pencil to edit a task, or the trash to delete it right away.'
          }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="week"
          type="button"
          role="switch"
          :aria-checked="mode === 'EDIT'"
          title="Toggle between Track and Edit mode"
          class="relative inline-flex h-8 w-28 items-center rounded-full border border-subtle bg-surface p-1 text-xs font-medium transition-colors"
          @click="toggleMode"
        >
          <span
            class="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-accent transition-transform duration-200"
            :class="mode === 'EDIT' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'"
          />
          <span
            class="z-10 flex-1 text-center"
            :class="mode === 'TRACK' ? 'text-white' : 'text-muted'"
          >
            Track
          </span>
          <span
            class="z-10 flex-1 text-center"
            :class="mode === 'EDIT' ? 'text-white' : 'text-muted'"
          >
            Edit
          </span>
        </button>
        <BaseButton
          v-if="week"
          variant="secondary"
          type="button"
          :disabled="closing || pendingCount > 0"
          :title="pendingCount > 0 ? `${pendingCount} task(s) still pending` : undefined"
          @click="handleCloseWeek"
        >
          <Lock class="h-4 w-4" />
          {{ closing ? 'Closing...' : 'Close week' }}
        </BaseButton>
        <RouterLink :to="{ name: 'admin-checklists-categories' }">
          <BaseButton variant="secondary" type="button">
            <Settings class="h-4 w-4" />
            Manage categories
          </BaseButton>
        </RouterLink>
        <RouterLink :to="{ name: 'admin-checklists-template' }">
          <BaseButton variant="secondary" type="button">
            <Table2 class="h-4 w-4" />
            Manage template
          </BaseButton>
        </RouterLink>
        <RouterLink :to="{ name: 'admin-analytics-checklists' }">
          <BaseButton variant="secondary" type="button">
            <BarChart3 class="h-4 w-4" />
            View trends
          </BaseButton>
        </RouterLink>
      </div>
    </div>

    <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
    <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>

    <EmptyState
      v-else-if="!week"
      :icon="ListChecks"
      title="No tasks created for this week yet"
      description="Generate this week's checklist from your template to get started."
    >
      <BaseButton variant="primary" type="button" class="mt-4" @click="openCreateModal">
        Create this week's tasks
      </BaseButton>
    </EmptyState>

    <template v-else>
      <!-- Pestanas de dias, la de hoy activa por defecto -->
      <div class="flex shrink-0 gap-1 overflow-x-auto border-b border-subtle">
        <button
          v-for="(day, index) in orderedDays"
          :key="day.value"
          type="button"
          :title="dayTabDate(index)"
          class="relative shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors"
          :class="[
            activeDay === day.value
              ? 'border border-b-0 border-subtle bg-surface'
              : 'hover:text-foreground',
            dayTabTextClass(day),
          ]"
          @click="activeDay = day.value"
        >
          {{ day.label }}
          <span
            v-if="day.value === todayDay"
            class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-text"
            title="Today"
          />
        </button>
      </div>

      <!-- Columnas por categoria: apiladas en mobile (pagina scrollea normal),
           en fila (como excel) desde sm, cada una con altura fija que llena
           la pantalla y scroll propio si las tareas no entran. -->
      <div
        class="grid grid-cols-1 gap-4 sm:min-h-0 sm:flex-1 sm:auto-cols-[260px] sm:grid-flow-col sm:grid-cols-none sm:overflow-x-auto sm:pb-2"
      >
        <section
          v-for="category in categories"
          :key="category.id"
          class="flex flex-col rounded-xl border border-subtle bg-surface p-3 sm:h-full sm:overflow-hidden"
        >
          <h3 class="mb-2 shrink-0 text-sm font-semibold text-foreground">{{ category.name }}</h3>

          <div class="space-y-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
            <div v-for="importance in ['HIGH', 'STANDARD'] as Importance[]" :key="importance">
              <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent-text">
                {{ importance === 'HIGH' ? 'High priority (2 pts)' : 'Standard (1 pt)' }}
              </p>

              <p v-if="!tasksFor(category.id, importance).length" class="text-xs text-muted">
                No tasks.
              </p>

              <ul v-else class="space-y-1">
                <li
                  v-for="task in tasksFor(category.id, importance)"
                  :key="task.id"
                  class="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
                  :class="{
                    'bg-success/15': task.status === 'COMPLETE',
                    'bg-ruby/15': task.status === 'FAILED',
                  }"
                >
                  <span
                    v-if="task.detail"
                    class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-text"
                    title="Has details"
                  />
                  <span
                    class="min-w-0 flex-1 truncate text-sm text-foreground"
                    :class="{
                      'text-muted line-through': task.status !== 'PENDING',
                      'cursor-pointer': mode === 'TRACK',
                    }"
                    :title="task.name"
                    @click="openDetailModal(task)"
                  >
                    {{ task.name }}
                  </span>
                  <div class="flex shrink-0 items-center gap-0.5">
                    <template v-if="mode === 'TRACK'">
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
                    </template>
                    <template v-else>
                      <button
                        type="button"
                        title="Edit task"
                        class="rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                        @click="openEditTaskForm(task)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete task"
                        class="rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-ruby-text"
                        @click="handleDeleteTask(task)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </template>
                  </div>
                </li>
              </ul>

              <button
                type="button"
                class="mt-1 flex items-center gap-1 text-xs text-muted hover:text-accent-text"
                @click="openCreateTaskForm(category.id, importance)"
              >
                <Plus class="h-3.5 w-3.5" />
                Add task
              </button>
            </div>
          </div>

          <div
            class="mt-2 flex shrink-0 items-center justify-between border-t border-subtle pt-2 text-sm"
          >
            <span class="text-muted">Total</span>
            <span class="font-semibold text-foreground">{{ totalFor(category.id) }} pts</span>
          </div>
        </section>
      </div>
    </template>

    <!-- Modal de alta/edicion de tarea -->
    <div
      v-if="taskFormOpen"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeTaskForm"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-1 text-sm font-semibold text-foreground">
          {{ taskForm.formMode === 'create' ? 'Add task' : 'Edit task' }}
        </h3>
        <p class="mb-4 text-xs text-muted">
          <template v-if="taskForm.formMode === 'create'">
            Only for {{ activeDayLabel }} this week — the template is not changed.
          </template>
          <template v-else> This only changes this task — the template is not affected. </template>
        </p>

        <div class="space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Name</span>
            <input
              v-model="taskForm.name"
              type="text"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Category</span>
            <select
              v-model.number="taskForm.categoryId"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Importance</span>
            <select
              v-model="taskForm.importance"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="HIGH">High priority (2 pts)</option>
              <option value="STANDARD">Standard (1 pt)</option>
            </select>
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Details (optional)</span>
            <textarea
              v-model="taskForm.detail"
              rows="3"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p v-if="taskFormError" class="mt-3 text-sm text-ruby-text">{{ taskFormError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="taskFormSaving"
            @click="closeTaskForm"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="taskFormSaving"
            @click="submitTaskForm"
          >
            {{ taskFormSaving ? 'Saving...' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Cuadro de mensaje con el detalle de una tarea (solo modo Track) -->
    <div
      v-if="detailModalTask"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeDetailModal"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">{{ detailModalTask.name }}</h3>
        <p class="whitespace-pre-wrap text-sm text-muted">
          {{ detailModalTask.detail || 'No details for this task.' }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            v-if="detailModalTask.detail"
            variant="secondary"
            type="button"
            @click="copyDetail"
          >
            <Copy class="h-4 w-4" />
            {{ detailCopyLabel }}
          </BaseButton>
          <BaseButton variant="success" type="button" @click="closeDetailModal">
            <Check class="h-4 w-4" />
            OK
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Modal para crear la semana -->
    <div
      v-if="createModalOpen"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeCreateModal"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-4 text-sm font-semibold text-foreground">Create this week's tasks</h3>

        <div class="space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Start date</span>
            <input
              v-model="createForm.firstDay"
              type="date"
              :min="nextRange?.min_first_day"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-muted">End date</span>
            <input
              v-model="createForm.lastDay"
              type="date"
              :min="nextRange?.min_last_day"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <p v-if="rangeError" class="text-xs text-muted">{{ rangeError }}</p>
        </div>

        <p v-if="createError" class="mt-3 text-sm text-ruby-text">{{ createError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="createSaving"
            @click="closeCreateModal"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="createSaving || !!rangeError"
            @click="submitCreateWeek"
          >
            {{ createSaving ? 'Creating...' : 'Create' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
