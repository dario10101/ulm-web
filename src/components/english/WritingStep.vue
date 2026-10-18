<script setup lang="ts">
import { Volume2 } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { PracticeTexts } from '@/lib/englishPractice'
import { speak, speechAvailable } from '@/lib/speech'
import type { EnglishPractice } from '@/types/english'

/**
 * Paso 3: responder por escrito a la frase del listening, con el minimo de
 * caracteres del nivel. Sin correccion aca: se corrige en el feedback.
 */
const props = defineProps<{ practice: EnglishPractice; texts: PracticeTexts }>()
const emit = defineEmits<{ complete: [text: string] }>()

const text = ref('')
const length = computed(() => text.value.trim().length)
const minimum = computed(() => props.practice.config.writing_min_chars)
const ready = computed(() => length.value >= minimum.value)

let stop: (() => void) | null = null
function replay() {
  stop = speak(props.practice.listening_sentence, props.practice.config.tts_rate, () => {})
}
onBeforeUnmount(() => stop?.())
</script>

<template>
  <div class="space-y-4">
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
      v-model="text"
      rows="5"
      maxlength="5000"
      lang="en"
      spellcheck="false"
      class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
      data-test="writing-text"
    />

    <div class="flex items-center justify-between gap-2">
      <span class="text-xs" :class="ready ? 'text-success-text' : 'text-muted'" data-test="counter">
        {{ length }} / {{ minimum }} {{ texts.characters }} ({{ texts.minimum }})
      </span>
      <BaseButton :disabled="!ready" data-test="continue" @click="emit('complete', text)">
        {{ texts.continue }}
      </BaseButton>
    </div>
  </div>
</template>
