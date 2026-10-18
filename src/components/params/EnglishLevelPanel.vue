<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { ApiError } from '@/lib/http'
import { getEnglishSettings, setEnglishLevel } from '@/services/englishApi'
import type { EnglishLevel, EnglishSettings } from '@/types/english'

/**
 * Nivel de ingles del usuario (Settings -> English). Ajusta la dificultad de
 * cada paso; en A1-A2 las instrucciones de la practica salen en español. Un
 * nivel sin banco (el admin todavia no lo lleno) aparece deshabilitado (D18).
 */
const LEVEL_NAMES: Record<EnglishLevel, string> = {
  A1: 'Beginner · Principiante',
  A2: 'Elementary · Básico',
  B1: 'Intermediate · Intermedio',
  B2: 'Upper intermediate · Intermedio alto',
  C1: 'Advanced · Avanzado',
  C2: 'Proficient · Experto',
}

const settings = shallowRef<EnglishSettings | null>(null)
const saving = ref<EnglishLevel | null>(null)
const error = ref<string | null>(null)
const saved = ref(false)

onMounted(async () => {
  try {
    settings.value = await getEnglishSettings()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load your level.'
  }
})

async function choose(level: EnglishLevel) {
  if (settings.value?.level === level) return
  saving.value = level
  error.value = null
  saved.value = false
  try {
    settings.value = await setEnglishLevel(level)
    saved.value = true
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save your level.'
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <BaseCard title="English level">
    <p class="mb-4 text-sm text-muted">
      Choose your CEFR level. Every step of the practice adapts to it; in A1 and A2 the instructions
      are in Spanish.
    </p>
    <div v-if="settings" class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Level">
      <button
        v-for="row in settings.levels"
        :key="row.level"
        type="button"
        role="radio"
        :aria-checked="settings.level === row.level"
        :disabled="!row.available || saving !== null"
        class="flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          settings.level === row.level
            ? 'border-accent-text bg-accent/10'
            : 'border-subtle hover:border-accent-text/50'
        "
        :data-test="`level-${row.level}`"
        @click="choose(row.level)"
      >
        <span class="w-7 text-sm font-semibold text-foreground">{{ row.level }}</span>
        <span class="min-w-0 text-sm">
          <span class="block text-foreground">{{ LEVEL_NAMES[row.level] }}</span>
          <span class="block text-xs text-muted">
            {{ row.available ? `${row.ready_words} words` : 'Not available yet' }}
          </span>
        </span>
      </button>
    </div>
    <p v-if="saved" class="mt-3 text-sm text-success-text" data-test="level-saved">Level saved.</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-ruby-text">{{ error }}</p>
  </BaseCard>
</template>
