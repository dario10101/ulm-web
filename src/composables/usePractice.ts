import { computed, reactive, ref, shallowRef } from 'vue'

import { ApiError } from '@/lib/http'
import {
  getNextPractice,
  requestFeedback,
  savePractice,
  setPracticeMastered,
} from '@/services/englishApi'
import type { EnglishFeedback, EnglishPractice, EnglishPracticeSaved } from '@/types/english'

/**
 * Maquina de estados de una practica (ENGLISH-TEACHER-PLAN.md, seccion 8).
 *
 * Toda la practica vive aca, en memoria, hasta el cierre (D8): recargar la
 * pagina la descarta. Al llegar al cierre se guarda entera (D21) con el check
 * "la domino" en su valor por defecto (marcado si no revelo la palabra), y
 * cambiar el check despues solo actualiza ese campo.
 *
 * Las vistas solo pintan el paso actual y llaman a las transiciones; asi el
 * flujo se puede testear sin montar componentes.
 */
export type PracticeStep =
  'loading' | 'vocabulary' | 'listening' | 'writing' | 'speaking' | 'closing' | 'error'

export interface PracticeResults {
  vocabRevealed: boolean
  vocabUsedSynonym: boolean
  vocabHintUsed: boolean
  listeningTextShown: boolean
  dictationText: string | null
  writingText: string
  readingTranscript: string | null
  readingMatchPct: number | null
  freeTranscript: string | null
  speakingSkipped: boolean
  audioSeconds: number
}

function emptyResults(): PracticeResults {
  return {
    vocabRevealed: false,
    vocabUsedSynonym: false,
    vocabHintUsed: false,
    listeningTextShown: false,
    dictationText: null,
    writingText: '',
    readingTranscript: null,
    readingMatchPct: null,
    freeTranscript: null,
    speakingSkipped: false,
    audioSeconds: 0,
  }
}

export function usePractice(options: { speaking?: boolean } = {}) {
  // Sin speaking, el writing va directo al cierre.
  const speakingEnabled = options.speaking ?? true

  const step = ref<PracticeStep>('loading')
  const practice = shallowRef<EnglishPractice | null>(null)
  const results = reactive<PracticeResults>(emptyResults())
  const saved = shallowRef<EnglishPracticeSaved | null>(null)
  const mastered = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const feedback = shallowRef<EnglishFeedback | null>(null)
  const feedbackLoading = ref(false)
  const feedbackError = ref<string | null>(null)

  function fail(err: unknown, fallback: string) {
    error.value = err instanceof ApiError ? err.message : fallback
  }

  async function start() {
    step.value = 'loading'
    error.value = null
    saved.value = null
    feedback.value = null
    feedbackError.value = null
    Object.assign(results, emptyResults())
    try {
      practice.value = await getNextPractice()
      step.value = 'vocabulary'
    } catch (err) {
      practice.value = null
      fail(err, 'Could not load a practice.')
      step.value = 'error'
    }
  }

  function completeVocabulary(outcome: {
    revealed: boolean
    usedSynonym: boolean
    hintUsed?: boolean
  }) {
    results.vocabRevealed = outcome.revealed
    results.vocabUsedSynonym = outcome.usedSynonym
    results.vocabHintUsed = outcome.hintUsed ?? false
    step.value = 'listening'
  }

  function completeListening(textShown: boolean) {
    results.listeningTextShown = textShown
    step.value = 'writing'
  }

  async function completeWriting(outcome: { dictation: string; answer: string }) {
    results.dictationText = outcome.dictation.trim() || null
    results.writingText = outcome.answer.trim()
    if (speakingEnabled) {
      step.value = 'speaking'
    } else {
      results.speakingSkipped = true
      await close()
    }
  }

  async function completeSpeaking(outcome: {
    readingTranscript: string | null
    readingMatchPct: number | null
    freeTranscript: string | null
    audioSeconds: number
    skipped: boolean
  }) {
    results.readingTranscript = outcome.readingTranscript
    results.readingMatchPct = outcome.readingMatchPct
    results.freeTranscript = outcome.freeTranscript
    results.audioSeconds = outcome.audioSeconds
    results.speakingSkipped = outcome.skipped
    await close()
  }

  /** Llega al cierre: guarda la practica entera (D21). */
  async function close() {
    if (!practice.value) return
    mastered.value = !results.vocabRevealed
    step.value = 'closing'
    await persist()
  }

  async function persist() {
    if (!practice.value) return
    saving.value = true
    error.value = null
    try {
      saved.value = await savePractice({
        word_id: practice.value.word_id,
        content_id: practice.value.content_id,
        vocab_revealed: results.vocabRevealed,
        vocab_used_synonym: results.vocabUsedSynonym,
        vocab_hint_used: results.vocabHintUsed,
        listening_text_shown: results.listeningTextShown,
        dictation_text: results.dictationText,
        writing_text: results.writingText,
        reading_transcript: results.readingTranscript,
        reading_match_pct: results.readingMatchPct,
        free_transcript: results.freeTranscript,
        speaking_skipped: results.speakingSkipped,
        audio_seconds: results.audioSeconds,
        mastered: mastered.value,
      })
      mastered.value = saved.value.mastered
    } catch (err) {
      fail(err, 'Could not save the practice.')
    } finally {
      saving.value = false
    }
  }

  async function setMastered(value: boolean) {
    mastered.value = value
    if (!saved.value) return
    try {
      saved.value = await setPracticeMastered(saved.value.id, value)
      mastered.value = saved.value.mastered
    } catch (err) {
      fail(err, 'Could not update the word.')
    }
  }

  /** Pide el feedback (gasta tokens; el backend lo guarda y no vuelve a cobrar). */
  async function loadFeedback() {
    if (!saved.value || feedbackLoading.value) return
    feedbackLoading.value = true
    feedbackError.value = null
    try {
      feedback.value = await requestFeedback(saved.value.id)
    } catch (err) {
      feedbackError.value = err instanceof ApiError ? err.message : 'Could not get the feedback.'
    } finally {
      feedbackLoading.value = false
    }
  }

  const stepIndex = computed(() =>
    ['vocabulary', 'listening', 'writing', 'speaking'].indexOf(step.value),
  )

  return {
    step,
    stepIndex,
    practice,
    results,
    saved,
    mastered,
    saving,
    error,
    feedback,
    feedbackLoading,
    feedbackError,
    speakingEnabled,
    start,
    completeVocabulary,
    completeListening,
    completeWriting,
    completeSpeaking,
    persist,
    setMastered,
    loadFeedback,
  }
}
