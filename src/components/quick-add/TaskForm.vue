<script setup lang="ts">
import { computed, onDeactivated, onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { addDays, formatIsoDate, isoWeekday, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import {
  buildDateTime,
  clockFromMinutes,
  formatLocalDateTime,
  minuteOptions,
  minutesOfDay,
  nextDateForWeekday,
  weekdayOptions,
} from '@/lib/time'
import { createCalendarTask } from '@/services/calendarTasksApi'
import { listCategories } from '@/services/checklistsApi'
import type { RepeatMode } from '@/types/calendarTask'
import type { Category, Importance } from '@/types/checklist'

// Formulario de tarea: mismos campos que "Add task" del checklist (name,
// category, importance, details) mas fecha/hora, notificacion, repeticion y
// el check de agregarla al checklist de la semana en curso.
const taskCategories = ref<Category[]>([])
// Por defecto la tarea se agenda para manana.
const taskDate = ref(formatIsoDate(addDays(new Date(), 1)))
const taskName = ref('')
const taskCategoryId = ref<number | null>(null)
const taskImportance = ref<Importance>('STANDARD')
const taskWeekday = ref(isoWeekday(parseIsoDate(taskDate.value)))
const taskHour = ref(7)
const taskMinute = ref(30)
const taskAmPm = ref<'AM' | 'PM'>('AM')

// Hora final: por defecto 1 hora despues del inicio (recortada a las 11:59pm
// si eso cruzaria al dia siguiente, que no esta permitido). Si el usuario la
// toca a mano (taskEndTouched), dejar de recalcularla cuando cambie el inicio.
const taskEndHour = ref(8)
const taskEndMinute = ref(30)
const taskEndAmpm = ref<'AM' | 'PM'>('AM')
const taskEndTouched = ref(false)

function applyDefaultEndTime() {
  const startMinutes = minutesOfDay(taskHour.value, taskMinute.value, taskAmPm.value)
  const defaultEndMinutes = Math.min(startMinutes + 60, 23 * 60 + 59)
  const { hour, minute, ampm } = clockFromMinutes(defaultEndMinutes)
  taskEndHour.value = hour
  taskEndMinute.value = minute
  taskEndAmpm.value = ampm
}

function markEndTouched() {
  taskEndTouched.value = true
}

watch([taskHour, taskMinute, taskAmPm], () => {
  if (!taskEndTouched.value) applyDefaultEndTime()
})
applyDefaultEndTime()

const taskNotify = ref(true)
const taskRepeatEnabled = ref(false)
const taskRepeatMode = ref<RepeatMode>('WEEKLY')
const taskAddToChecklist = ref(false)
const taskDetail = ref('')
const taskSubmitting = ref(false)
const taskError = ref<string | null>(null)
const taskSaved = ref(false)

const isWeeklyRepeat = computed(() => taskRepeatEnabled.value && taskRepeatMode.value === 'WEEKLY')

// Si se activa "repeat weekly", el selector de dia arranca en el dia de la
// fecha que ya estaba puesta (y la fecha se oculta mientras dure ese modo).
watch(isWeeklyRepeat, (weekly) => {
  if (weekly) {
    taskWeekday.value = isoWeekday(parseIsoDate(taskDate.value))
  }
})

async function loadTaskCategories() {
  try {
    taskCategories.value = await listCategories()
    if (taskCategoryId.value === null) {
      const personal = taskCategories.value.find((c) => c.name.toLowerCase() === 'personal')
      if (personal) taskCategoryId.value = personal.id
    }
  } catch {
    // Si falla, el select de categoria simplemente queda vacio.
  }
}

async function handleTaskSubmit() {
  taskError.value = null

  const name = taskName.value.trim()
  if (!name || !taskCategoryId.value) {
    taskError.value = 'Name and category are required.'
    return
  }
  if (!isWeeklyRepeat.value && !taskDate.value) {
    taskError.value = 'Date is required.'
    return
  }

  const startMinutes = minutesOfDay(taskHour.value, taskMinute.value, taskAmPm.value)
  const endMinutes = minutesOfDay(taskEndHour.value, taskEndMinute.value, taskEndAmpm.value)
  if (endMinutes <= startMinutes) {
    taskError.value = 'End time must be after start time, on the same day.'
    return
  }

  const anchorDate = isWeeklyRepeat.value
    ? nextDateForWeekday(taskWeekday.value)
    : parseIsoDate(taskDate.value)
  const dateTime = buildDateTime(anchorDate, taskHour.value, taskMinute.value, taskAmPm.value)

  taskSubmitting.value = true
  try {
    await createCalendarTask({
      name,
      importance: taskImportance.value,
      category_id: taskCategoryId.value,
      notify: taskNotify.value,
      repeat_mode: taskRepeatEnabled.value ? taskRepeatMode.value : null,
      scheduled_date: taskRepeatEnabled.value ? null : formatLocalDateTime(dateTime),
      repeat_date: taskRepeatEnabled.value ? formatLocalDateTime(dateTime) : null,
      duration_minutes: endMinutes - startMinutes,
      add_to_checklist: taskAddToChecklist.value,
      detail: taskDetail.value.trim() || null,
    })
    taskSaved.value = true
    taskName.value = ''
    taskDetail.value = ''
    taskEndTouched.value = false
    applyDefaultEndTime()
  } catch (err) {
    taskError.value = err instanceof ApiError ? err.message : 'Could not save this task.'
  } finally {
    taskSubmitting.value = false
  }
}

onMounted(loadTaskCategories)

// La pagina envuelve los forms en KeepAlive: el borrador sobrevive al cambiar
// de tipo, pero el feedback del ultimo envio no debe reaparecer al volver.
onDeactivated(() => {
  taskSaved.value = false
  taskError.value = null
})
</script>

<template>
  <BaseCard title="New task">
    <form class="space-y-4" @submit.prevent="handleTaskSubmit">
      <!-- Fila 1: nombre (mitad) + categoria (cuarto) + importancia (cuarto) -->
      <div class="grid gap-4 sm:grid-cols-4">
        <label class="text-sm sm:col-span-2">
          <span class="mb-1 block text-muted">Name *</span>
          <input
            v-model="taskName"
            type="text"
            required
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block text-muted">Category *</span>
          <select
            v-model.number="taskCategoryId"
            required
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option :value="null" disabled>Select a category</option>
            <option v-for="category in taskCategories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>
        <label class="text-sm">
          <span class="mb-1 block text-muted">Importance *</span>
          <select
            v-model="taskImportance"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option value="HIGH">High priority (2 pts)</option>
            <option value="STANDARD">Standard (1 pt)</option>
          </select>
        </label>
      </div>

      <!-- Fila 2: fecha/dia, hora de inicio, hora final, repeat check -->
      <div class="grid gap-4 sm:grid-cols-4">
        <label v-if="!isWeeklyRepeat" class="text-sm">
          <span class="mb-1 block text-muted">Date *</span>
          <input
            v-model="taskDate"
            type="date"
            required
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label v-else class="text-sm">
          <span class="mb-1 block text-muted">Day of week *</span>
          <select
            v-model.number="taskWeekday"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option v-for="day in weekdayOptions" :key="day.value" :value="day.value">
              {{ day.label }}
            </option>
          </select>
        </label>

        <div class="text-sm">
          <span class="mb-1 block text-muted">Start time *</span>
          <div class="grid grid-cols-3 gap-2">
            <select
              v-model.number="taskHour"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
            >
              <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
            </select>
            <select
              v-model.number="taskMinute"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
            >
              <option v-for="m in minuteOptions" :key="m" :value="m">
                {{ String(m).padStart(2, '0') }}
              </option>
            </select>
            <select
              v-model="taskAmPm"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <div class="text-sm">
          <span class="mb-1 block text-muted">End time *</span>
          <div class="grid grid-cols-3 gap-2">
            <select
              v-model.number="taskEndHour"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
              @change="markEndTouched"
            >
              <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
            </select>
            <select
              v-model.number="taskEndMinute"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
              @change="markEndTouched"
            >
              <option v-for="m in minuteOptions" :key="m" :value="m">
                {{ String(m).padStart(2, '0') }}
              </option>
            </select>
            <select
              v-model="taskEndAmpm"
              class="w-full rounded-lg border border-subtle bg-surface px-2 py-2 text-sm"
              @change="markEndTouched"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <label class="text-sm">
          <span class="mb-1 block text-muted">Repeat</span>
          <span
            class="flex items-center gap-2 rounded-lg border border-subtle bg-surface px-3 py-2"
          >
            <input
              v-model="taskRepeatEnabled"
              type="checkbox"
              class="h-4 w-4 rounded border-subtle"
            />
            <span class="text-muted">Repeat task</span>
          </span>
        </label>
      </div>

      <!-- Fila 2b: modo de repeat, solo si esta marcado -->
      <div v-if="taskRepeatEnabled" class="grid gap-4 sm:grid-cols-4">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Repeat every</span>
          <select
            v-model="taskRepeatMode"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option value="WEEKLY">Week (same day of week)</option>
            <option value="MONTHLY">Month (same day of month)</option>
            <option value="YEARLY">Year (same day and month)</option>
          </select>
        </label>
      </div>

      <!-- Fila 3: checks de notificacion y de agregar al checklist, alineados a la izquierda -->
      <div class="flex flex-wrap items-center gap-x-8 gap-y-2">
        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="taskNotify" type="checkbox" class="h-4 w-4 rounded border-subtle" />
          Notify me
        </label>
        <label class="flex items-center gap-2 text-sm text-muted">
          <input
            v-model="taskAddToChecklist"
            type="checkbox"
            class="h-4 w-4 rounded border-subtle"
          />
          Also add to this week's checklist
        </label>
      </div>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Details (optional)</span>
        <textarea
          v-model="taskDetail"
          rows="2"
          class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
        />
      </label>

      <div class="flex items-center gap-3">
        <BaseButton type="submit" :disabled="taskSubmitting">
          {{ taskSubmitting ? 'Saving...' : 'Save' }}
        </BaseButton>
        <span v-if="taskSaved" class="text-sm text-accent-text">Saved.</span>
        <span v-if="taskError" class="text-sm text-ruby-text">{{ taskError }}</span>
      </div>
    </form>
  </BaseCard>
</template>
