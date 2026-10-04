<script setup lang="ts">
import { Check, Pencil, Trash2 } from '@lucide/vue'
import { computed } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useCategories } from '@/composables/useCategories'
import { eventDateLabel } from '@/lib/userEvents'
import { isUserEvent, type CalendarEventRange } from '@/types/calendarEvent'

/**
 * Detalle de un evento. Solo los personales se editan o borran: los festivos y
 * fechas especiales son de todos los usuarios y los administra el admin.
 */
const props = defineProps<{ event: CalendarEventRange | null }>()

const emit = defineEmits<{
  close: []
  edit: [event: CalendarEventRange]
  remove: [event: CalendarEventRange]
}>()

const { categoryName } = useCategories()

const editable = computed(() => !!props.event && isUserEvent(props.event))
</script>

<template>
  <div
    v-if="event"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
      <p
        v-if="event.code"
        class="mb-1 text-[10px] font-medium uppercase tracking-wide text-accent-text"
      >
        {{ event.code }}
      </p>
      <h3 class="mb-1 text-sm font-semibold text-foreground">{{ event.name }}</h3>
      <p class="mb-3 text-xs text-muted">
        <template v-if="event.category_id !== null"
          >{{ categoryName(event.category_id) }} ·
        </template>
        {{ eventDateLabel(event) }}
      </p>
      <p class="whitespace-pre-wrap text-sm text-muted">
        {{ event.detail || 'No details for this event.' }}
      </p>
      <p v-if="!editable" class="mt-3 text-xs text-muted">
        Holidays and special dates are managed by the administrator.
      </p>

      <div class="mt-5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <template v-if="editable">
            <button
              type="button"
              title="Edit event"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              @click="emit('edit', event)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Delete event"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              @click="emit('remove', event)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </template>
        </div>
        <BaseButton variant="success" type="button" @click="emit('close')">
          <Check class="h-4 w-4" />
          OK
        </BaseButton>
      </div>
    </div>
  </div>
</template>
