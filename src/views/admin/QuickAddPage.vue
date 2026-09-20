<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { recordTypes, type RecordType } from '@/config/recordTypes'
import { addDays, formatIsoDate, isoWeekday, parseDecimal, parseIsoDate, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { createCalendarTask } from '@/services/calendarTasksApi'
import { listCategories } from '@/services/checklistsApi'
import { createWeight } from '@/services/weightsApi'
import type { RepeatMode } from '@/types/calendarTask'
import type { Category, Importance } from '@/types/checklist'

const selected = ref<RecordType | null>(null)

// Formulario generico (todas las categorias menos "weight" y "task"): prototipo sin persistencia.
const saved = ref(false)

// Formulario de peso: end-to-end real contra la API.
const weightDate = ref(todayIsoDate())
const weightValue = ref('')
const weightNote = ref('')
const weightSubmitting = ref(false)
const weightError = ref<string | null>(null)
const weightSaved = ref(false)

// Formulario de tarea: mismos campos que "Add task" del checklist (name,
// category, importance, details) mas fecha/hora, notificacion, repeticion y
// el check de agregarla al checklist de la semana en curso.
const taskCategories = ref<Category[]>([])
const weekdayOptions = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]
const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5)

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

function to12Hour(totalMinutes: number): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hour24 = Math.floor(normalized / 60)
  const minute = normalized % 60
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute, ampm }
}

function minutesOfDay(hour12: number, minute: number, ampm: 'AM' | 'PM'): number {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  return hour24 * 60 + minute
}

function applyDefaultEndTime() {
  const startMinutes = minutesOfDay(taskHour.value, taskMinute.value, taskAmPm.value)
  const defaultEndMinutes = Math.min(startMinutes + 60, 23 * 60 + 59)
  const { hour, minute, ampm } = to12Hour(defaultEndMinutes)
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

function nextDateForWeekday(weekday: number, from: Date = new Date()): Date {
  const offset = (weekday - isoWeekday(from) + 7) % 7
  return addDays(from, offset)
}

function buildDateTime(anchorDate: Date, hour12: number, minute: number, ampm: 'AM' | 'PM'): Date {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  const result = new Date(anchorDate)
  result.setHours(hour24, minute, 0, 0)
  return result
}

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

function selectType(type: RecordType) {
  selected.value = type
  saved.value = false
  weightSaved.value = false
  weightError.value = null
  taskSaved.value = false
  taskError.value = null
}

function handleSubmit() {
  // Prototipo sin backend: solo confirma visualmente el flujo.
  saved.value = true
}

async function handleWeightSubmit() {
  weightError.value = null

  const parsedWeight = parseDecimal(weightValue.value)
  if (parsedWeight === null || parsedWeight <= 0) {
    weightError.value = 'Enter a valid weight greater than 0.'
    return
  }
  if (!weightDate.value) {
    weightError.value = 'Date is required.'
    return
  }

  weightSubmitting.value = true
  try {
    await createWeight({
      weight_kg: parsedWeight,
      recorded_on: weightDate.value,
      note: weightNote.value.trim() || null,
    })
    weightSaved.value = true
    weightValue.value = ''
    weightNote.value = ''
  } catch (err) {
    weightError.value = err instanceof ApiError ? err.message : 'Could not save this record.'
  } finally {
    weightSubmitting.value = false
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

  const anchorDate = isWeeklyRepeat.value ? nextDateForWeekday(taskWeekday.value) : parseIsoDate(taskDate.value)
  const dateTime = buildDateTime(anchorDate, taskHour.value, taskMinute.value, taskAmPm.value)

  taskSubmitting.value = true
  try {
    await createCalendarTask({
      name,
      importance: taskImportance.value,
      category_id: taskCategoryId.value,
      notify: taskNotify.value,
      repeat_mode: taskRepeatEnabled.value ? taskRepeatMode.value : null,
      scheduled_date: taskRepeatEnabled.value ? null : dateTime.toISOString(),
      repeat_date: taskRepeatEnabled.value ? dateTime.toISOString() : null,
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
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Add a record</h1>
      <p class="text-sm text-muted">
        Pick what you want to log. The faster this is, the more useful the app becomes.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        v-for="type in recordTypes"
        :key="type.id"
        type="button"
        :disabled="!type.implemented"
        :title="type.implemented ? undefined : 'Coming soon'"
        class="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors"
        :class="[
          selected?.id === type.id
            ? 'border-accent bg-accent/10 text-accent-text'
            : 'border-subtle text-muted hover:border-accent-text/50',
          type.implemented ? '' : 'pointer-events-none opacity-40',
        ]"
        @click="selectType(type)"
      >
        <component :is="type.icon" class="h-5 w-5" />
        {{ type.label }}
      </button>
    </div>

    <BaseCard v-if="selected?.id === 'weight'" title="New weight">
      <form class="space-y-4" @submit.prevent="handleWeightSubmit">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block text-muted">Date *</span>
            <input
              v-model="weightDate"
              type="date"
              required
              class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block text-muted">Weight (kg) *</span>
            <input
              v-model="weightValue"
              type="text"
              inputmode="decimal"
              placeholder="e.g. 72,4"
              required
              class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label class="block text-sm">
          <span class="mb-1 block text-muted">Notes</span>
          <textarea
            v-model="weightNote"
            rows="2"
            class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </label>
        <div class="flex items-center gap-3">
          <BaseButton type="submit" :disabled="weightSubmitting">
            {{ weightSubmitting ? 'Saving...' : 'Save' }}
          </BaseButton>
          <span v-if="weightSaved" class="text-sm text-accent-text">Saved.</span>
          <span v-if="weightError" class="text-sm text-ruby-text">{{ weightError }}</span>
        </div>
      </form>
    </BaseCard>

    <BaseCard v-else-if="selected?.id === 'task'" title="New task">
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
            <span class="flex items-center gap-2 rounded-lg border border-subtle bg-surface px-3 py-2">
              <input v-model="taskRepeatEnabled" type="checkbox" class="h-4 w-4 rounded border-subtle" />
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
            <input v-model="taskAddToChecklist" type="checkbox" class="h-4 w-4 rounded border-subtle" />
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

    <BaseCard v-else-if="selected" :title="`New ${selected.label.toLowerCase()}`">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block text-muted">Date</span>
            <input
              type="date"
              class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block text-muted">Value</span>
            <input
              type="text"
              placeholder="e.g. 25.50, 72.4kg, 45min..."
              class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label class="block text-sm">
          <span class="mb-1 block text-muted">Notes</span>
          <textarea rows="2" class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm" />
        </label>
        <div class="flex items-center gap-3">
          <BaseButton type="submit">Save</BaseButton>
          <span v-if="saved" class="text-sm text-accent-text">Looks good — nothing is actually saved yet.</span>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
