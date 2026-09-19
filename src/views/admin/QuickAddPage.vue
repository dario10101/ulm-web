<script setup lang="ts">
import { ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { recordTypes, type RecordType } from '@/config/recordTypes'
import { parseDecimal, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { createWeight } from '@/services/weightsApi'

const selected = ref<RecordType | null>(null)

// Formulario generico (todas las categorias menos "weight"): prototipo sin persistencia.
const saved = ref(false)

// Formulario de peso: end-to-end real contra la API.
const weightDate = ref(todayIsoDate())
const weightValue = ref('')
const weightNote = ref('')
const weightSubmitting = ref(false)
const weightError = ref<string | null>(null)
const weightSaved = ref(false)

function selectType(type: RecordType) {
  selected.value = type
  saved.value = false
  weightSaved.value = false
  weightError.value = null
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
        class="flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors"
        :class="
          selected?.id === type.id
            ? 'border-accent bg-accent/10 text-accent-text'
            : 'border-subtle text-muted hover:border-accent-text/50'
        "
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
