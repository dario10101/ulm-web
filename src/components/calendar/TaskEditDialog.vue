<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useCategories } from '@/composables/useCategories'
import { formatIsoDate, isoWeekday } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { validateTaskForm } from '@/lib/taskForm'
import {
  clockFromDate,
  clockFromMinutes,
  minuteOptions,
  minutesOfDay,
  weekdayOptions,
} from '@/lib/time'
import { updateCalendarTask } from '@/services/calendarTasksApi'
import type { CalendarTaskOccurrence, RepeatMode } from '@/types/calendarTask'
import type { Importance } from '@/types/checklist'

/**
 * Edicion de una tarea de calendario: mismos campos que la creacion salvo
 * `repeat_mode` y `add_to_checklist`, que no son editables (decision del
 * backend, ver CldTaskUpdate).
 *
 * La fecha/semana se prellena desde el ancla real de la serie
 * (scheduled_date/repeat_date), no desde la ocurrencia que se clickeo: en modo
 * MONTHLY esa ocurrencia puede venir recortada por el clamp de fin de mes.
 */
const props = defineProps<{ task: CalendarTaskOccurrence | null }>()

const emit = defineEmits<{ close: []; saved: [] }>()

const { categories } = useCategories()

interface EditFormState {
  taskId: number
  repeatMode: RepeatMode | null
  name: string
  categoryId: number | null
  importance: Importance
  notify: boolean
  detail: string
  date: string
  weekday: number
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
  endHour: number
  endMinute: number
  endAmpm: 'AM' | 'PM'
}

const form = ref<EditFormState | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.task,
  (occurrence) => {
    error.value = null
    if (!occurrence) {
      form.value = null
      return
    }
    const anchorIso =
      occurrence.repeat_date ?? occurrence.scheduled_date ?? occurrence.occurrence_local
    const anchor = new Date(anchorIso)
    const { hour, minute, ampm } = clockFromDate(anchor)
    const endMinutes = minutesOfDay(hour, minute, ampm) + occurrence.duration_minutes
    const { hour: endHour, minute: endMinute, ampm: endAmpm } = clockFromMinutes(endMinutes)
    form.value = {
      taskId: occurrence.id,
      repeatMode: occurrence.repeat_mode,
      name: occurrence.name,
      categoryId: occurrence.category_id,
      importance: occurrence.importance,
      notify: occurrence.notify,
      detail: occurrence.detail ?? '',
      date: formatIsoDate(anchor),
      weekday: isoWeekday(anchor),
      hour,
      minute,
      ampm,
      endHour,
      endMinute,
      endAmpm,
    }
  },
  { immediate: true },
)

async function submit() {
  if (!form.value) return
  const state = form.value

  const validated = validateTaskForm(state, state.repeatMode === 'WEEKLY')
  if (!validated.ok) {
    error.value = validated.error
    return
  }

  saving.value = true
  error.value = null
  try {
    await updateCalendarTask(state.taskId, {
      name: validated.name,
      importance: state.importance,
      category_id: validated.categoryId,
      notify: state.notify,
      detail: state.detail.trim() || null,
      scheduled_date: state.repeatMode ? null : validated.localDateTime,
      repeat_date: state.repeatMode ? validated.localDateTime : null,
      duration_minutes: validated.durationMinutes,
    })
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save the task.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="form"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
      <h3 class="mb-1 text-sm font-semibold text-foreground">Edit task</h3>
      <p v-if="form.repeatMode" class="mb-4 text-xs text-muted">
        Repeats {{ form.repeatMode.toLowerCase() }} — the recurrence itself can't be changed here.
      </p>

      <div class="space-y-3">
        <label class="block text-sm">
          <span class="mb-1 block text-muted">Name</span>
          <input
            v-model="form.name"
            type="text"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
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
          <label class="text-sm">
            <span class="mb-1 block text-muted">Importance</span>
            <select
              v-model="form.importance"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="HIGH">High priority (2 pts)</option>
              <option value="STANDARD">Standard (1 pt)</option>
            </select>
          </label>
        </div>

        <label v-if="form.repeatMode !== 'WEEKLY'" class="block text-sm">
          <span class="mb-1 block text-muted">Date</span>
          <input
            v-model="form.date"
            type="date"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>
        <label v-else class="block text-sm">
          <span class="mb-1 block text-muted">Day of week</span>
          <select
            v-model.number="form.weekday"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          >
            <option v-for="day in weekdayOptions" :key="day.value" :value="day.value">
              {{ day.label }}
            </option>
          </select>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <div class="text-sm">
            <span class="mb-1 block text-muted">Start time</span>
            <div class="grid grid-cols-3 gap-1">
              <select
                v-model.number="form.hour"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
              </select>
              <select
                v-model.number="form.minute"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option v-for="m in minuteOptions" :key="m" :value="m">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
              <select
                v-model="form.ampm"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div class="text-sm">
            <span class="mb-1 block text-muted">End time</span>
            <div class="grid grid-cols-3 gap-1">
              <select
                v-model.number="form.endHour"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
              </select>
              <select
                v-model.number="form.endMinute"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option v-for="m in minuteOptions" :key="m" :value="m">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
              <select
                v-model="form.endAmpm"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="form.notify" type="checkbox" class="h-4 w-4 rounded border-subtle" />
          Notify me
        </label>

        <label class="block text-sm">
          <span class="mb-1 block text-muted">Details (optional)</span>
          <textarea
            v-model="form.detail"
            rows="3"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p v-if="error" class="mt-3 text-sm text-ruby-text">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" type="button" :disabled="saving" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="button" :disabled="saving" @click="submit">
          {{ saving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
