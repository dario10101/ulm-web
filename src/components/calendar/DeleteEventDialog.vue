<script setup lang="ts">
import { X } from '@lucide/vue'
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { ApiError } from '@/lib/http'
import { eventDateLabel } from '@/lib/userEvents'
import { deleteUserEvent } from '@/services/calendarEventsApi'
import type { CalendarEventRange } from '@/types/calendarEvent'

/** Confirmacion de borrado de un evento personal (borra el rango completo). */
const props = defineProps<{ event: CalendarEventRange | null }>()

const emit = defineEmits<{ close: []; deleted: [] }>()

const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.event,
  () => {
    error.value = null
  },
)

async function submit() {
  if (!props.event) return
  saving.value = true
  error.value = null
  try {
    await deleteUserEvent(props.event.id)
    emit('deleted')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not delete the event.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="event"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
      <h3 class="mb-2 text-sm font-semibold text-foreground">Delete "{{ event.name }}"?</h3>
      <p class="text-sm text-muted">
        The whole event ({{ eventDateLabel(event) }}) will be removed. This can't be undone.
      </p>

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
