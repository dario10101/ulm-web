<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { parseDecimal } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { updateWeight } from '@/services/weightsApi'
import type { Weight } from '@/types/weight'

/** Edicion de un registro de peso ya existente. */
const props = defineProps<{ record: Weight | null }>()

const emit = defineEmits<{ close: []; saved: [] }>()

const weightText = ref('')
const recordedOn = ref('')
const note = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.record,
  (record) => {
    error.value = null
    if (!record) return
    weightText.value = String(record.weight_kg)
    recordedOn.value = record.recorded_on
    note.value = record.note ?? ''
  },
  { immediate: true },
)

async function submit() {
  if (!props.record) return

  // Acepta coma o punto como separador decimal (ver parseDecimal).
  const weight = parseDecimal(weightText.value)
  if (weight === null || weight <= 0) {
    error.value = 'Enter a valid weight.'
    return
  }
  if (!recordedOn.value) {
    error.value = 'Date is required.'
    return
  }

  saving.value = true
  error.value = null
  try {
    await updateWeight(props.record.id, {
      weight_kg: weight,
      recorded_on: recordedOn.value,
      note: note.value.trim() || null,
    })
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this record.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="record"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <form
      class="w-full max-w-sm space-y-3 rounded-xl border border-subtle bg-surface p-5"
      @submit.prevent="submit"
    >
      <h3 class="text-sm font-semibold text-foreground">Edit weight record</h3>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Weight (kg)</span>
        <input
          v-model="weightText"
          type="text"
          inputmode="decimal"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Date</span>
        <input
          v-model="recordedOn"
          type="date"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Note</span>
        <input
          v-model="note"
          type="text"
          maxlength="500"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>

      <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-1">
        <BaseButton variant="secondary" type="button" :disabled="saving" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
