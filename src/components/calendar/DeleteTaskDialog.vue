<script setup lang="ts">
import { X } from '@lucide/vue'
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { formatIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { deleteCalendarTask } from '@/services/calendarTasksApi'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Confirmacion de borrado. Si la tarea repite ofrece borrar solo esa
 * ocurrencia (marcado por defecto) o la serie completa.
 */
const props = defineProps<{ task: CalendarTaskOccurrence | null }>()

const emit = defineEmits<{ close: []; deleted: [] }>()

const onlyThisOccurrence = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.task,
  () => {
    onlyThisOccurrence.value = true
    error.value = null
  },
)

async function submit() {
  if (!props.task) return
  const target = props.task
  // El dia que se manda al backend es el dia LOCAL del usuario.
  const occurrenceDate =
    target.repeat_mode && onlyThisOccurrence.value
      ? formatIsoDate(new Date(target.occurrence_local))
      : undefined

  saving.value = true
  error.value = null
  try {
    await deleteCalendarTask(target.id, occurrenceDate)
    emit('deleted')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not delete the task.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="task"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
      <h3 class="mb-2 text-sm font-semibold text-foreground">Delete "{{ task.name }}"?</h3>
      <p class="text-sm text-muted">This can't be undone.</p>

      <label v-if="task.repeat_mode" class="mt-3 flex items-center gap-2 text-sm text-muted">
        <input v-model="onlyThisOccurrence" type="checkbox" class="h-4 w-4 rounded border-subtle" />
        Delete only this occurrence (uncheck to delete the whole series)
      </label>

      <p v-if="error" class="mt-3 text-sm text-ruby-text">{{ error }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" type="button" :disabled="saving" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          type="button"
          :disabled="saving"
          class="!bg-ruby hover:!bg-ruby/90"
          @click="submit"
        >
          <X class="h-4 w-4" />
          {{ saving ? 'Deleting...' : 'Delete' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
