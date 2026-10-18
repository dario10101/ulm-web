<script setup lang="ts">
import { Volume2 } from '@lucide/vue'
import { onBeforeUnmount, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { PracticeTexts } from '@/lib/englishPractice'
import { speak, speechAvailable } from '@/lib/speech'
import type { EnglishPractice } from '@/types/english'

/**
 * Paso 2: la frase con la palabra, leida por la voz del navegador a la
 * velocidad del nivel. Al terminar de escucharla se habilitan continuar y
 * "ver el texto" (que queda registrado para el feedback).
 */
const props = defineProps<{ practice: EnglishPractice; texts: PracticeTexts }>()
const emit = defineEmits<{ complete: [textShown: boolean] }>()

const supported = speechAvailable()
const playing = ref(false)
// Sin voz en el navegador no hay nada que esperar: se muestra el texto.
const heard = ref(!supported)
const textShown = ref(!supported)
let stop: (() => void) | null = null

function play() {
  playing.value = true
  stop = speak(props.practice.listening_sentence, props.practice.config.tts_rate, () => {
    playing.value = false
    heard.value = true
  })
}

onBeforeUnmount(() => stop?.())
</script>

<template>
  <div class="space-y-5 text-center">
    <p class="text-sm text-muted">{{ texts.listeningInstruction }}</p>

    <p v-if="!supported" class="text-sm text-muted">{{ texts.noSpeech }}</p>
    <BaseButton v-else :disabled="playing" data-test="play" @click="play">
      <Volume2 class="h-4 w-4" />
      {{ heard ? texts.playAgain : texts.play }}
    </BaseButton>

    <p
      v-if="textShown"
      class="mx-auto max-w-lg rounded-lg bg-surface-hover px-4 py-3 text-base text-foreground"
      data-test="listening-text"
    >
      {{ practice.listening_sentence }}
    </p>

    <div v-if="heard" class="flex justify-center gap-2">
      <BaseButton
        v-if="!textShown"
        variant="secondary"
        data-test="show-text"
        @click="textShown = true"
      >
        {{ texts.showText }}
      </BaseButton>
      <BaseButton data-test="continue" @click="emit('complete', textShown)">
        {{ texts.continue }}
      </BaseButton>
    </div>
  </div>
</template>
