<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useCategories } from '@/composables/useCategories'
import { isoWeekday, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { defaultEndMinutes, validateTaskForm } from '@/lib/taskForm'
import { clockFromMinutes, minuteOptions, minutesOfDay, weekdayOptions } from '@/lib/time'
import { createCalendarTask } from '@/services/calendarTasksApi'
import type { RepeatMode } from '@/types/calendarTask'
import type { Importance } from '@/types/checklist'

/**
 * Alta de tarea de calendario: la misma funcionalidad que "Add record" > Task
 * (QuickAddPage), accesible directo desde el calendario en las 4 vistas.
 */
const props = defineProps<{
  open: boolean
  /** Fecha inicial, que depende de la vista desde la que se abrio. */
  defaultDate: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const { categories } = useCategories()

interface AddTaskFormState {
  name: string
  categoryId: number | null
  importance: Importance
  date: string
  weekday: number
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
  endHour: number
  endMinute: number
  endAmpm: 'AM' | 'PM'
  endTouched: boolean
  notify: boolean
  repeatEnabled: boolean
  repeatMode: RepeatMode
  addToChecklist: boolean
  detail: string
}

const form = ref<AddTaskFormState | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

const isWeeklyRepeat = computed(
  () => !!form.value?.repeatEnabled && form.value.repeatMode === 'WEEKLY',
)

watch(
  () => props.open,
  (open) => {
    error.value = null
    if (!open) {
      form.value = null
      return
    }
    const personal = categories.value.find((c) => c.name.toLowerCase() === 'personal')
    form.value = {
      name: '',
      categoryId: personal ? personal.id : (categories.value[0]?.id ?? null),
      importance: 'STANDARD',
      date: props.defaultDate,
      weekday: isoWeekday(parseIsoDate(props.defaultDate)),
      hour: 7,
      minute: 30,
      ampm: 'AM',
      endHour: 8,
      endMinute: 30,
      endAmpm: 'AM',
      endTouched: false,
      notify: true,
      repeatEnabled: false,
      repeatMode: 'WEEKLY',
      addToChecklist: false,
      detail: '',
    }
  },
  { immediate: true },
)

/** La hora final sigue a la de inicio mientras el usuario no la toque. */
function onStartTimeChange() {
  if (!form.value || form.value.endTouched) return
  const start = minutesOfDay(form.value.hour, form.value.minute, form.value.ampm)
  const { hour, minute, ampm } = clockFromMinutes(defaultEndMinutes(start))
  form.value.endHour = hour
  form.value.endMinute = minute
  form.value.endAmpm = ampm
}

function onEndTimeChange() {
  if (form.value) form.value.endTouched = true
}

async function submit() {
  if (!form.value) return
  const state = form.value

  const validated = validateTaskForm(state, isWeeklyRepeat.value)
  if (!validated.ok) {
    error.value = validated.error
    return
  }

  submitting.value = true
  error.value = null
  try {
    await createCalendarTask({
      name: validated.name,
      importance: state.importance,
      category_id: validated.categoryId,
      notify: state.notify,
      repeat_mode: state.repeatEnabled ? state.repeatMode : null,
      scheduled_date: state.repeatEnabled ? null : validated.localDateTime,
      repeat_date: state.repeatEnabled ? validated.localDateTime : null,
      duration_minutes: validated.durationMinutes,
      add_to_checklist: state.addToChecklist,
      detail: state.detail.trim() || null,
    })
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this task.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="form"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md rounded-xl border border-subtle bg-surface p-5">
      <h3 class="mb-4 text-sm font-semibold text-foreground">Add task</h3>

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

        <div class="grid grid-cols-2 gap-3">
          <label v-if="!isWeeklyRepeat" class="text-sm">
            <span class="mb-1 block text-muted">Date</span>
            <input
              v-model="form.date"
              type="date"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <label v-else class="text-sm">
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
          <label class="text-sm">
            <span class="mb-1 block text-muted">Repeat</span>
            <span
              class="flex items-center gap-2 rounded-lg border border-subtle bg-background px-3 py-2"
            >
              <input
                v-model="form.repeatEnabled"
                type="checkbox"
                class="h-4 w-4 rounded border-subtle"
              />
              <span class="text-muted">Repeat task</span>
            </span>
          </label>
        </div>

        <label v-if="form.repeatEnabled" class="block text-sm">
          <span class="mb-1 block text-muted">Repeat every</span>
          <select
            v-model="form.repeatMode"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          >
            <option value="WEEKLY">Week (same day of week)</option>
            <option value="MONTHLY">Month (same day of month)</option>
            <option value="YEARLY">Year (same day and month)</option>
          </select>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <div class="text-sm">
            <span class="mb-1 block text-muted">Start time</span>
            <div class="grid grid-cols-3 gap-1">
              <select
                v-model.number="form.hour"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                @change="onStartTimeChange"
              >
                <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
              </select>
              <select
                v-model.number="form.minute"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                @change="onStartTimeChange"
              >
                <option v-for="m in minuteOptions" :key="m" :value="m">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
              <select
                v-model="form.ampm"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                @change="onStartTimeChange"
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
                @change="onEndTimeChange"
              >
                <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
              </select>
              <select
                v-model.number="form.endMinute"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                @change="onEndTimeChange"
              >
                <option v-for="m in minuteOptions" :key="m" :value="m">
                  {{ String(m).padStart(2, '0') }}
                </option>
              </select>
              <select
                v-model="form.endAmpm"
                class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                @change="onEndTimeChange"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label class="flex items-center gap-2 text-sm text-muted">
            <input v-model="form.notify" type="checkbox" class="h-4 w-4 rounded border-subtle" />
            Notify me
          </label>
          <label class="flex items-center gap-2 text-sm text-muted">
            <input
              v-model="form.addToChecklist"
              type="checkbox"
              class="h-4 w-4 rounded border-subtle"
            />
            Also add to this week's checklist
          </label>
        </div>

        <label class="block text-sm">
          <span class="mb-1 block text-muted">Details (optional)</span>
          <textarea
            v-model="form.detail"
            rows="2"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p v-if="error" class="mt-3 text-sm text-ruby-text">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" type="button" :disabled="submitting" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
