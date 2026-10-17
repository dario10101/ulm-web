<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { askAi, getAiModels } from '@/services/aiApi'
import type { AiAnswer, AiModel } from '@/types/ai'

// Mismo tope que el backend (app/schemas/ai.py): ahi tambien es control de costo.
const MAX_LENGTH = 2000

const question = ref('')
const answer = ref<AiAnswer | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

// Catalogo del backend (app/services/ai_models.py), ya filtrado por los que la
// key tiene habilitados. Mientras carga, el backend usa su default.
const models = ref<AiModel[]>([])
const selectedModel = ref('')

const selected = computed(() => models.value.find((model) => model.id === selectedModel.value))
const canAsk = computed(() => !loading.value && question.value.trim().length > 0)

function formatPrice(model: AiModel): string {
  return `$${model.input_usd_per_1m} / $${model.output_usd_per_1m} per 1M tokens (in / out)`
}

onMounted(async () => {
  try {
    const catalog = await getAiModels()
    models.value = catalog.models
    selectedModel.value = catalog.default
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load the models'
  }
})

async function ask(): Promise<void> {
  if (!canAsk.value) return
  loading.value = true
  error.value = null
  try {
    answer.value = await askAi(question.value.trim(), selectedModel.value || undefined)
  } catch (err) {
    answer.value = null
    error.value = err instanceof Error ? err.message : 'Could not get an answer'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">AI features</h1>
      <p class="text-sm text-muted">
        Ask anything. Each question is independent: no history or personal data is sent.
      </p>
    </div>

    <BaseCard title="Ask">
      <form class="space-y-3" @submit.prevent="ask">
        <div class="space-y-1">
          <label for="ai-model" class="text-xs font-medium text-muted">Model</label>
          <select
            id="ai-model"
            v-model="selectedModel"
            :disabled="!models.length || loading"
            class="w-full rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm sm:w-72"
          >
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.label }}
            </option>
          </select>
          <p v-if="selected" data-testid="ai-model-info" class="text-xs text-muted">
            {{ selected.description }} {{ formatPrice(selected) }}
          </p>
        </div>
        <textarea
          v-model="question"
          rows="4"
          :maxlength="MAX_LENGTH"
          placeholder="Type your question… (Ctrl+Enter to send)"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          @keydown.ctrl.enter.prevent="ask"
        />
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted">{{ question.length }}/{{ MAX_LENGTH }}</span>
          <BaseButton type="submit" :disabled="!canAsk">
            {{ loading ? 'Thinking…' : 'Ask' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>

    <p v-if="error" role="alert" class="text-sm text-rose-600 dark:text-rose-400">{{ error }}</p>

    <BaseCard v-if="answer" title="Answer">
      <!-- Texto plano (sin render de markdown): nada del modelo se interpreta como HTML. -->
      <p data-testid="ai-answer" class="whitespace-pre-wrap text-sm text-foreground">
        {{ answer.answer }}
      </p>
      <p class="mt-3 text-xs text-muted">Model: {{ answer.model }}</p>
    </BaseCard>
  </div>
</template>
