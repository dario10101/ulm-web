<script setup lang="ts">
import { Check, ListChecks, Lock, Settings, Table2, X } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  closeWeek,
  createWeek,
  getCurrentWeek,
  listCategories,
  listWeekTasks,
  updateTaskStatus,
} from '@/services/checklistsApi'
import { defaultWeekRange, isoWeekday } from '@/lib/date'
import { ApiError } from '@/lib/http'
import type { Category, Task, TaskStatus, Week } from '@/types/checklist'

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

const tasksForActiveDay = computed(() => tasks.value.filter((t) => t.day_of_week === activeDay.value))

function tasksFor(categoryId: number): Task[] {
  return tasksForActiveDay.value.filter((t) => t.category_id === categoryId)
}

function totalFor(categoryId: number): number {
  return tasksFor(categoryId).reduce((sum, t) => sum + t.points, 0)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [categoriesResponse, weekResponse] = await Promise.all([listCategories(), getCurrentWeek()])
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

async function handleCloseWeek() {
  if (!week.value) return
  if (!window.confirm('Close this week? Its score will be locked in and tasks can no longer change.')) {
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

const isValidRange = computed(() => {
  if (!createForm.value.firstDay || !createForm.value.lastDay) return false
  const first = new Date(createForm.value.firstDay)
  const last = new Date(createForm.value.lastDay)
  const days = Math.round((last.getTime() - first.getTime()) / 86_400_000)
  return days === 6
})

function openCreateModal() {
  createForm.value = defaultWeekRange()
  createError.value = null
  createModalOpen.value = true
}

function closeCreateModal() {
  createModalOpen.value = false
}

async function submitCreateWeek() {
  if (!isValidRange.value) {
    createError.value = 'The range must cover exactly 7 days.'
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
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Today's checklist</h1>
        <p class="text-sm text-muted">Tap the check or the cross to mark a task, no extra steps.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton v-if="week" variant="secondary" type="button" :disabled="closing" @click="handleCloseWeek">
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
      <div class="flex gap-1 overflow-x-auto border-b border-subtle">
        <button
          v-for="day in DAYS"
          :key="day.value"
          type="button"
          class="shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors"
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

      <!-- Columnas por categoria: apiladas en mobile, en fila (como excel) desde sm -->
      <div class="grid grid-cols-1 gap-4 sm:auto-cols-[260px] sm:grid-flow-col sm:grid-cols-none sm:overflow-x-auto sm:pb-2">
        <section
          v-for="category in categories"
          :key="category.id"
          class="flex flex-col rounded-xl border border-subtle bg-surface p-4"
        >
          <h3 class="mb-3 text-sm font-semibold text-foreground">{{ category.name }}</h3>

          <p v-if="!tasksFor(category.id).length" class="text-sm text-muted">No tasks for this day.</p>

          <ul v-else class="space-y-1.5">
            <li
              v-for="task in tasksFor(category.id)"
              :key="task.id"
              class="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors"
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
              <span class="shrink-0 text-xs text-muted">{{ task.points }}</span>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  title="Mark completed"
                  class="rounded-md p-2 transition-colors"
                  :class="
                    task.status === 'COMPLETE'
                      ? 'bg-success text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-success-text'
                  "
                  @click="setStatus(task, 'COMPLETE')"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Mark not achieved"
                  class="rounded-md p-2 transition-colors"
                  :class="
                    task.status === 'FAILED'
                      ? 'bg-ruby text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-ruby-text'
                  "
                  @click="setStatus(task, 'FAILED')"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </li>
          </ul>

          <div class="mt-auto flex items-center justify-between border-t border-subtle pt-2 text-sm">
            <span class="text-muted">Total</span>
            <span class="font-semibold text-foreground">{{ totalFor(category.id) }} pts</span>
          </div>
        </section>
      </div>
    </template>

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
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-muted">End date</span>
            <input
              v-model="createForm.lastDay"
              type="date"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <p v-if="!isValidRange" class="text-xs text-muted">The range must cover exactly 7 days.</p>
        </div>

        <p v-if="createError" class="mt-3 text-sm text-ruby-text">{{ createError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton variant="secondary" type="button" :disabled="createSaving" @click="closeCreateModal">
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="createSaving || !isValidRange"
            @click="submitCreateWeek"
          >
            {{ createSaving ? 'Creating...' : 'Create' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
