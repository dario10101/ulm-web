<script setup lang="ts">
import { onDeactivated, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { parseDecimal, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { createWeight } from '@/services/weightsApi'

// Formulario de peso: end-to-end real contra la API.
const weightDate = ref(todayIsoDate())
const weightValue = ref('')
const weightNote = ref('')
const weightSubmitting = ref(false)
const weightError = ref<string | null>(null)
const weightSaved = ref(false)

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

// La pagina envuelve los forms en KeepAlive: el borrador sobrevive al cambiar
// de tipo, pero el feedback del ultimo envio no debe reaparecer al volver.
onDeactivated(() => {
  weightSaved.value = false
  weightError.value = null
})
</script>

<template>
  <BaseCard title="New weight">
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
</template>
