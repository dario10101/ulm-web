<script setup lang="ts">
import { Volume2 } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'

import WordDiff from '@/components/english/WordDiff.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { PracticeTexts } from '@/lib/englishPractice'
import { ApiError } from '@/lib/http'
import { speak, speechAvailable } from '@/lib/speech'
import { checkDictation } from '@/services/englishApi'
import type { EnglishDictationResult, EnglishPractice } from '@/types/english'

/**
 * Paso 3, en dos fases (ENGLISH-TEACHER-PLAN.md, D33):
 * 1. Dictado: escribir la frase que escucho. "Revisar" la compara con la frase
 *    del listening (diff por palabras en el backend, sin LLM ni costo) y
 *    muestra la frase correcta. Despues se continua, este bien o no.
 * 2. Respuesta: responder a la frase con el minimo de caracteres del nivel.
 *    Sin correccion aca: se corrige en el feedback.
 */
const props = defineProps<{ practice: EnglishPractice; texts: PracticeTexts }>()
const emit = defineEmits<{ complete: [outcome: { dictation: string; answer: string }] }>()

const phase = ref<'dictation' | 'answer'>('dictation')

// --- Fase 1: dictado ---
const dictation = ref('')
const checking = ref(false)
const checkError = ref<string | null>(null)
const result = shallowRef<EnglishDictationResult | null>(null)

async function check() {
  if (!dictation.value.trim() || checking.value) return
  checking.value = true
  checkError.value = null
  try {
    result.value = await checkDictation(props.practice.content_id, dictation.value.trim())
  } catch (err) {
    checkError.value = err instanceof ApiError ? err.message : 'Could not check the sentence.'
  } finally {
    checking.value = false
  }
}

// --- Fase 2: respuesta ---
const answer = ref('')
const length = computed(() => answer.value.trim().length)
const minimum = computed(() => props.practice.config.writing_min_chars)
const ready = computed(() => length.value >= minimum.value)

let stop: (() => void) | null = null
function replay() {
  stop?.()
  stop = speak(props.practice.listening_sentence, props.practice.config.tts_rate, () => {})
}
onBeforeUnmount(() => stop?.())
</script>

<template>
  <div class="space-y-4">
    <template v-if="phase === 'dictation'">
      <p class="text-sm text-muted">{{ texts.dictationInstruction }}</p>
      <button
        v-if="speechAvailable()"
        type="button"
        class="inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
        data-test="replay"
        @click="replay"
      >
        <Volume2 class="h-4 w-4" /> {{ texts.playAgain }}
      </button>

      <textarea
        v-model="dictation"
        rows="2"
        maxlength="1000"
        lang="en"
        spellcheck="false"
        autocomplete="off"
        :disabled="result !== null"
        class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-base"
        data-test="dictation-text"
        @keydown.enter.prevent="check"
      />

      <p v-if="checkError" role="alert" class="text-sm text-ruby-text">{{ checkError }}</p>

      <div
        v-if="result"
        class="space-y-2 rounded-lg border border-subtle p-4"
        data-test="dictation-result"
      >
        <p class="text-sm text-foreground" data-test="dictation-match">
          {{ texts.dictationMatch }}: <strong>{{ result.match_pct }}%</strong>
        </p>
        <WordDiff :ops="result.diff" />
        <p class="text-sm text-muted">
          {{ texts.dictationExpected }}:
          <span class="text-foreground" lang="en" data-test="dictation-expected">
            {{ result.expected }}
          </span>
        </p>
      </div>

      <div class="flex justify-end">
        <BaseButton
          v-if="!result"
          :disabled="!dictation.trim() || checking"
          data-test="check"
          @click="check"
        >
          {{ checking ? texts.checking : texts.check }}
        </BaseButton>
        <BaseButton v-else data-test="continue" @click="phase = 'answer'">
          {{ texts.continue }}
        </BaseButton>
      </div>
    </template>

    <template v-else>
      <p class="text-sm text-muted">{{ texts.writingInstruction }}</p>
      <div class="rounded-lg bg-surface-hover px-4 py-3">
        <p class="text-base font-medium text-foreground" data-test="writing-prompt">
          {{ practice.writing_prompt }}
        </p>
        <p
          v-if="practice.config.instructions_lang === 'es' && practice.writing_prompt_es"
          class="mt-1 text-sm text-muted"
          data-test="writing-prompt-es"
        >
          {{ practice.writing_prompt_es }}
        </p>
        <button
          v-if="speechAvailable()"
          type="button"
          class="mt-2 inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
          @click="replay"
        >
          <Volume2 class="h-3.5 w-3.5" /> {{ texts.playAgain }}
        </button>
      </div>

      <textarea
        v-model="answer"
        rows="5"
        maxlength="5000"
        lang="en"
        spellcheck="false"
        class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        data-test="writing-text"
      />

      <div class="flex items-center justify-between gap-2">
        <span
          class="text-xs"
          :class="ready ? 'text-success-text' : 'text-muted'"
          data-test="counter"
        >
          {{ length }} / {{ minimum }} {{ texts.characters }} ({{ texts.minimum }})
        </span>
        <BaseButton
          :disabled="!ready"
          data-test="continue"
          @click="emit('complete', { dictation, answer })"
        >
          {{ texts.continue }}
        </BaseButton>
      </div>
    </template>
  </div>
</template>
