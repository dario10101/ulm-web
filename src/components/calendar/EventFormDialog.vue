<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import EventCodePicker from '@/components/calendar/EventCodePicker.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useCategories } from '@/composables/useCategories'
import { ApiError } from '@/lib/http'
import { validateEventForm, type EventFormFields } from '@/lib/userEvents'
import { createUserEvent, listUserEventCodes, updateUserEvent } from '@/services/calendarEventsApi'
import type { CalendarEventRange } from '@/types/calendarEvent'

/**
 * Alta y edicion de un evento personal: es la misma ventana, con los mismos
 * campos. Con `event` se edita ese evento; sin el, se crea uno nuevo que
 * arranca y termina en `defaultDate`.
 */
const props = defineProps<{
  open: boolean
  event: CalendarEventRange | null
  defaultDate: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const { categories } = useCategories()

const form = ref<EventFormFields | null>(null)
const codes = ref<string[]>([])
const codesLoading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const isEdit = computed(() => props.event !== null)

watch(
  () => props.open,
  (open) => {
    error.value = null
    if (!open) {
      form.value = null
      return
    }
    const event = props.event
    form.value = event
      ? {
          name: event.name,
          code: event.code ?? '',
          categoryId: event.category_id,
          firstDay: event.first_day,
          lastDay: event.last_day,
          detail: event.detail ?? '',
        }
      : {
          name: '',
          code: '',
          categoryId: categories.value[0]?.id ?? null,
          firstDay: props.defaultDate,
          lastDay: props.defaultDate,
          detail: '',
        }
    void loadCodes()
  },
  { immediate: true },
)

// Mover el inicio despues del fin arrastra el fin: es casi siempre lo que se
// quiere (un evento de un dia que se corre de fecha) y evita el error.
watch(
  () => form.value?.firstDay,
  (firstDay) => {
    if (form.value && firstDay && form.value.lastDay < firstDay) form.value.lastDay = firstDay
  },
)

async function loadCodes() {
  codesLoading.value = true
  try {
    codes.value = await listUserEventCodes()
  } catch {
    // Sin la lista igual se puede escribir un tipo a mano.
    codes.value = []
  } finally {
    codesLoading.value = false
  }
}

async function submit() {
  if (!form.value) return
  const validated = validateEventForm(form.value)
  if (!validated.ok) {
    error.value = validated.error
    return
  }

  saving.value = true
  error.value = null
  try {
    if (props.event) await updateUserEvent(props.event.id, validated.payload)
    else await createUserEvent(validated.payload)
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save the event.'
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
    <div
      class="max-h-full w-full max-w-sm overflow-y-auto rounded-xl border border-subtle bg-surface p-5"
    >
      <h3 class="mb-4 text-sm font-semibold text-foreground">
        {{ isEdit ? 'Edit event' : 'Add event' }}
      </h3>

      <p v-if="!categories.length" class="text-sm text-muted">
        No categories yet — create one from the checklist page first.
      </p>

      <form v-else class="space-y-3" @submit.prevent="submit">
        <label class="block text-sm">
          <span class="mb-1 block text-muted">Name</span>
          <input
            v-model="form.name"
            type="text"
            maxlength="200"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>

        <EventCodePicker v-model="form.code" :codes="codes" :loading="codesLoading" />

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

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
            <span class="mb-1 block text-muted">Start date</span>
            <input
              v-model="form.firstDay"
              type="date"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1 block text-muted">End date</span>
            <input
              v-model="form.lastDay"
              type="date"
              :min="form.firstDay"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label class="block text-sm">
          <span class="mb-1 block text-muted">Details (optional)</span>
          <textarea
            v-model="form.detail"
            rows="3"
            maxlength="2000"
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>

        <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>
      </form>

      <div class="mt-5 flex justify-end gap-2">
        <BaseButton variant="secondary" type="button" :disabled="saving" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton
          v-if="categories.length"
          variant="primary"
          type="button"
          :disabled="saving"
          @click="submit"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
