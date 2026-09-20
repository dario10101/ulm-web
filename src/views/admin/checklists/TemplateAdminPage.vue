<script setup lang="ts">
import { ArrowLeft, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { ApiError } from '@/lib/http'
import {
  createTemplateTask,
  deleteTemplateTaskForDay,
  listCategories,
  listTemplateTasks,
  updateTemplateTaskForDay,
} from '@/services/checklistsApi'
import type { Category, Importance, TemplateTask } from '@/types/checklist'

// Asuncion: dia 1 = Lunes ... dia 7 = Domingo (ISO-8601). Si tu convencion es
// otra, se ajusta aqui sin tocar el resto de la pantalla.
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
const tasks = ref<TemplateTask[]>([])
const activeDay = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)

const activeDayLabel = computed(
  () => DAYS.find((d) => d.value === activeDay.value)?.label ?? '',
)

const tasksForActiveDay = computed(() => tasks.value.filter((t) => t.days.includes(activeDay.value)))

function tasksFor(categoryId: number, importance: Importance): TemplateTask[] {
  return tasksForActiveDay.value.filter(
    (t) => t.category_id === categoryId && t.importance === importance,
  )
}

function totalFor(categoryId: number): number {
  return tasksForActiveDay.value
    .filter((t) => t.category_id === categoryId)
    .reduce((sum, t) => sum + t.points, 0)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [categoriesResponse, tasksResponse] = await Promise.all([
      listCategories(),
      listTemplateTasks(),
    ])
    categories.value = categoriesResponse
    tasks.value = tasksResponse
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load the template.'
  } finally {
    loading.value = false
  }
}

async function reloadTasks() {
  tasks.value = await listTemplateTasks()
}

// --- Formulario de alta/edicion (modal simple) ---

interface TaskFormState {
  mode: 'create' | 'edit'
  taskId: number | null
  name: string
  importance: Importance
  categoryId: number | null
  days: number[]
  detail: string
}

const formOpen = ref(false)
const formSaving = ref(false)
const formError = ref<string | null>(null)
const form = ref<TaskFormState>({
  mode: 'create',
  taskId: null,
  name: '',
  importance: 'STANDARD',
  categoryId: null,
  days: [],
  detail: '',
})

function openCreateForm(categoryId: number, importance: Importance) {
  form.value = {
    mode: 'create',
    taskId: null,
    name: '',
    importance,
    categoryId,
    days: [activeDay.value],
    detail: '',
  }
  formError.value = null
  formOpen.value = true
}

function openEditForm(task: TemplateTask) {
  form.value = {
    mode: 'edit',
    taskId: task.id,
    name: task.name,
    importance: task.importance,
    categoryId: task.category_id,
    days: [],
    detail: task.detail ?? '',
  }
  formError.value = null
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

function toggleFormDay(day: number) {
  const index = form.value.days.indexOf(day)
  if (index === -1) form.value.days.push(day)
  else form.value.days.splice(index, 1)
}

async function submitForm() {
  const name = form.value.name.trim()
  if (!name || !form.value.categoryId) {
    formError.value = 'Name and category are required.'
    return
  }
  if (form.value.mode === 'create' && form.value.days.length === 0) {
    formError.value = 'Select at least one day.'
    return
  }

  formSaving.value = true
  formError.value = null
  try {
    const detail = form.value.detail.trim() || null
    if (form.value.mode === 'create') {
      await createTemplateTask({
        name,
        importance: form.value.importance,
        category_id: form.value.categoryId,
        days: form.value.days,
        detail,
      })
    } else if (form.value.taskId !== null) {
      await updateTemplateTaskForDay(form.value.taskId, activeDay.value, {
        name,
        importance: form.value.importance,
        category_id: form.value.categoryId,
        detail,
      })
    }
    await reloadTasks()
    closeForm()
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : 'Could not save the task.'
  } finally {
    formSaving.value = false
  }
}

async function removeTask(task: TemplateTask) {
  const scope = task.days.length > 1 ? ` (only for ${activeDayLabel.value})` : ''
  if (!window.confirm(`Remove "${task.name}"${scope}?`)) return

  error.value = null
  try {
    await deleteTemplateTaskForDay(task.id, activeDay.value)
    await reloadTasks()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not delete the task.'
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div>
      <RouterLink
        :to="{ name: 'admin-checklists' }"
        class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to checklist
      </RouterLink>
      <h1 class="text-xl font-semibold text-foreground">Manage template</h1>
      <p class="text-sm text-muted">
        Fixed weekly tasks per day and category, so you don't have to re-enter them every week.
      </p>
    </div>

    <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
    <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>

    <EmptyState
      v-else-if="!categories.length"
      :icon="Plus"
      title="No categories yet"
      description="Create at least one category before building the template."
    />

    <template v-else>
      <!-- Pestanas de dias, como en un excel -->
      <div class="flex gap-1 overflow-x-auto border-b border-subtle">
        <button
          v-for="day in DAYS"
          :key="day.value"
          type="button"
          class="shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            activeDay === day.value
              ? 'border border-b-0 border-subtle bg-surface text-foreground'
              : 'text-muted hover:text-foreground'
          "
          @click="activeDay = day.value"
        >
          {{ day.label }}
        </button>
      </div>

      <!-- Columnas por categoria, ordenadas por prioridad -->
      <div class="grid auto-cols-[260px] grid-flow-col gap-4 overflow-x-auto pb-2">
        <section
          v-for="category in categories"
          :key="category.id"
          class="flex flex-col rounded-xl border border-subtle bg-surface p-4"
        >
          <h3 class="mb-3 text-sm font-semibold text-foreground">{{ category.name }}</h3>

          <div v-for="importance in (['HIGH', 'STANDARD'] as Importance[])" :key="importance" class="mb-4">
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent-text">
              {{ importance === 'HIGH' ? 'High priority (2 pts)' : 'Standard (1 pt)' }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="task in tasksFor(category.id, importance)"
                :key="task.id"
                class="flex items-center justify-between gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-surface-hover"
              >
                <span
                  v-if="task.detail"
                  class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-text"
                  title="Has details"
                />
                <span class="truncate text-foreground" :title="task.name">{{ task.name }}</span>
                <span class="flex items-center gap-1 text-muted">
                  <button
                    type="button"
                    class="rounded p-1 hover:bg-surface-hover hover:text-foreground"
                    title="Edit"
                    @click="openEditForm(task)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 hover:bg-surface-hover hover:text-ruby-text"
                    title="Remove"
                    @click="removeTask(task)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            </ul>
            <button
              type="button"
              class="mt-1 flex items-center gap-1 text-xs text-muted hover:text-accent-text"
              @click="openCreateForm(category.id, importance)"
            >
              <Plus class="h-3.5 w-3.5" />
              Add task
            </button>
          </div>

          <div class="mt-auto flex items-center justify-between border-t border-subtle pt-2 text-sm">
            <span class="text-muted">Total</span>
            <span class="font-semibold text-foreground">{{ totalFor(category.id) }} pts</span>
          </div>
        </section>
      </div>
    </template>

    <!-- Modal de alta/edicion de tarea -->
    <div
      v-if="formOpen"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeForm"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-4 text-sm font-semibold text-foreground">
          {{ form.mode === 'create' ? 'Add task' : `Edit task (${activeDayLabel} only)` }}
        </h3>

        <div class="space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Name</span>
            <input
              v-model="form.name"
              type="text"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Category</span>
            <select
              v-model.number="form.categoryId"
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
              v-model="form.importance"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="HIGH">High priority (2 pts)</option>
              <option value="STANDARD">Standard (1 pt)</option>
            </select>
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Details (optional)</span>
            <textarea
              v-model="form.detail"
              rows="3"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>

          <div v-if="form.mode === 'create'" class="text-sm">
            <span class="mb-1 block text-muted">Applies to</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="day in DAYS"
                :key="day.value"
                type="button"
                class="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                :class="
                  form.days.includes(day.value)
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-muted hover:text-foreground'
                "
                @click="toggleFormDay(day.value)"
              >
                {{ day.label }}
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-muted">
            This only changes {{ activeDayLabel }}. Other days keep the original task.
          </p>
        </div>

        <p v-if="formError" class="mt-3 text-sm text-ruby-text">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton variant="secondary" type="button" :disabled="formSaving" @click="closeForm">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="button" :disabled="formSaving" @click="submitForm">
            {{ formSaving ? 'Saving...' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
