<script setup lang="ts">
import { Mic, Square } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'

import WordDiff from '@/components/english/WordDiff.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { PracticeTexts } from '@/lib/englishPractice'
import { ApiError } from '@/lib/http'
import {
  type ActiveRecording,
  MicrophoneError,
  type MicrophoneProblem,
  recordingSupported,
  startRecording,
} from '@/lib/recorder'
import { transcribeSpeech } from '@/services/englishApi'
import type { EnglishPractice, EnglishSpeechResult } from '@/types/english'

/**
 * Paso 4, en dos fases (ENGLISH-TEACHER-PLAN.md, seccion 3):
 * 1. Lectura: el texto (frase del listening + frases nuevas + pregunta) en
 *    pantalla; se graba, se transcribe y se compara con el texto esperado.
 * 2. Libre: continuar la conversacion respondiendo la pregunta, con el tope
 *    de segundos del nivel; se transcribe y se guarda para el feedback.
 *
 * Cada grabacion transcrita gasta tokens (registrados en el backend). Sin
 * microfono se puede saltar el paso para no bloquear la practica.
 */
const props = defineProps<{ practice: EnglishPractice; texts: PracticeTexts }>()
const emit = defineEmits<{
  complete: [
    outcome: {
      readingTranscript: string | null
      readingMatchPct: number | null
      freeTranscript: string | null
      audioSeconds: number
      skipped: boolean
    },
  ]
}>()

type Phase = 'reading' | 'free'
type Status = 'idle' | 'recording' | 'uploading' | 'done'

// Mismo tope que el backend para la lectura (READING_MAX_SECONDS).
const READING_MAX_SECONDS = 120

const phase = ref<Phase>('reading')
const status = ref<Status>('idle')
const elapsed = ref(0)
const error = ref<string | null>(null)
const micProblem = ref<MicrophoneProblem | null>(recordingSupported() ? null : 'unsupported')
const reading = ref<EnglishSpeechResult | null>(null)
const free = ref<EnglishSpeechResult | null>(null)
// Suma de todas las grabaciones transcritas, incluidas las repetidas.
const audioSeconds = ref(0)

let active: ActiveRecording | null = null
let timer: ReturnType<typeof setInterval> | null = null

const maxSeconds = computed(() =>
  phase.value === 'reading' ? READING_MAX_SECONDS : props.practice.config.free_speaking_seconds,
)
const secondsLeft = computed(() => Math.max(0, Math.ceil(maxSeconds.value - elapsed.value)))
const current = computed(() => (phase.value === 'reading' ? reading.value : free.value))

function clearTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

async function record() {
  error.value = null
  try {
    active = await startRecording()
  } catch (err) {
    micProblem.value = err instanceof MicrophoneError ? err.problem : 'unsupported'
    return
  }
  status.value = 'recording'
  elapsed.value = 0
  const started = Date.now()
  timer = setInterval(() => {
    elapsed.value = (Date.now() - started) / 1000
    // Al llegar al tope se detiene sola.
    if (elapsed.value >= maxSeconds.value) void stop()
  }, 250)
}

async function stop() {
  if (!active) return
  clearTimer()
  const recording = await active.stop()
  active = null
  status.value = 'uploading'
  try {
    const result = await transcribeSpeech({
      audio: recording.blob,
      mimeType: recording.mimeType,
      contentId: props.practice.content_id,
      phase: phase.value,
      seconds: Math.min(recording.seconds, maxSeconds.value),
    })
    audioSeconds.value += result.duration_seconds
    if (phase.value === 'reading') reading.value = result
    else free.value = result
    status.value = 'done'
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not transcribe the audio.'
    status.value = current.value ? 'done' : 'idle'
  }
}

function next() {
  if (phase.value === 'reading') {
    phase.value = 'free'
    status.value = 'idle'
    error.value = null
    return
  }
  emit('complete', {
    readingTranscript: reading.value?.transcript ?? null,
    readingMatchPct: reading.value?.match_pct ?? null,
    freeTranscript: free.value?.transcript ?? null,
    audioSeconds: Math.round(audioSeconds.value * 10) / 10,
    skipped: false,
  })
}

function skip() {
  emit('complete', {
    readingTranscript: reading.value?.transcript ?? null,
    readingMatchPct: reading.value?.match_pct ?? null,
    freeTranscript: null,
    audioSeconds: Math.round(audioSeconds.value * 10) / 10,
    skipped: true,
  })
}

onBeforeUnmount(() => {
  clearTimer()
  active?.cancel()
})
</script>

<template>
  <div class="space-y-5">
    <template v-if="phase === 'reading'">
      <p class="text-sm text-muted">{{ texts.speakingReadInstruction }}</p>
      <p
        class="rounded-lg bg-surface-hover px-4 py-3 text-base leading-relaxed text-foreground"
        lang="en"
        data-test="reading-text"
      >
        {{ practice.reading_text }}
      </p>
    </template>
    <template v-else>
      <p class="text-sm text-muted">{{ texts.speakingFreeInstruction }}</p>
      <p
        class="rounded-lg bg-surface-hover px-4 py-3 text-base font-medium text-foreground"
        lang="en"
        data-test="reading-question"
      >
        {{ practice.reading_question }}
      </p>
    </template>

    <div v-if="micProblem" class="space-y-3 text-center" data-test="mic-problem">
      <p class="text-sm text-ruby-text">
        {{ micProblem === 'denied' ? texts.micDenied : texts.micUnsupported }}
      </p>
      <BaseButton variant="secondary" data-test="skip-speaking" @click="skip">
        {{ texts.skipSpeaking }}
      </BaseButton>
    </div>

    <div v-else class="flex flex-col items-center gap-2">
      <button
        v-if="status !== 'recording'"
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-full bg-cta text-white transition-colors hover:bg-cta-hover disabled:opacity-50"
        :disabled="status === 'uploading'"
        :aria-label="current ? texts.recordAgain : texts.record"
        data-test="record"
        @click="record"
      >
        <Mic class="h-7 w-7" />
      </button>
      <button
        v-else
        type="button"
        class="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white dark:bg-rose-500"
        :aria-label="texts.stop"
        data-test="stop"
        @click="stop"
      >
        <Square class="h-6 w-6" />
      </button>
      <p class="text-xs text-muted" data-test="record-status">
        <template v-if="status === 'recording'">{{ secondsLeft }} {{ texts.secondsLeft }}</template>
        <template v-else-if="status === 'uploading'">{{ texts.transcribing }}</template>
        <template v-else-if="current">{{ texts.recordAgain }}</template>
        <template v-else>{{ texts.record }}</template>
      </p>
    </div>

    <p v-if="error" role="alert" class="text-center text-sm text-ruby-text">{{ error }}</p>

    <div
      v-if="current"
      class="space-y-2 rounded-lg border border-subtle p-4"
      data-test="speech-result"
    >
      <p v-if="current.match_pct !== null" class="text-sm text-foreground" data-test="match">
        {{ texts.match }}: <strong>{{ current.match_pct }}%</strong>
      </p>
      <WordDiff v-if="current.diff" :ops="current.diff" />
      <div v-else>
        <p class="text-xs font-medium text-muted">{{ texts.youSaid }}</p>
        <p class="text-sm text-foreground" lang="en" data-test="transcript">
          {{ current.transcript }}
        </p>
      </div>
      <p class="text-[11px] text-muted">{{ texts.transcriptionNote }}</p>
    </div>

    <div v-if="current && status === 'done'" class="flex justify-center">
      <BaseButton data-test="continue" @click="next">{{ texts.continue }}</BaseButton>
    </div>
  </div>
</template>
