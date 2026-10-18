import { getJson, patchJson, postForm, postJson, putJson } from '@/lib/http'
import type {
  EnglishDictationResult,
  EnglishFeedback,
  EnglishLevel,
  EnglishPractice,
  EnglishPracticeSaved,
  EnglishPracticeWrite,
  EnglishSettings,
  EnglishSpeechResult,
} from '@/types/english'

// Practica de ingles (permiso `english`). Ver ENGLISH-TEACHER-PLAN.md.

export function getEnglishSettings(): Promise<EnglishSettings> {
  return getJson<EnglishSettings>('/english/settings')
}

export function setEnglishLevel(level: EnglishLevel): Promise<EnglishSettings> {
  return putJson<EnglishSettings>('/english/settings', { level })
}

/** "No por ahora": no se vuelve a sugerir hasta juntar 10 practicas nuevas. */
export function dismissLevelSuggestion(): Promise<EnglishSettings> {
  return postJson<EnglishSettings>('/english/settings/level-suggestion/dismiss', {})
}

/** Elige la palabra y trae la practica entera. No guarda nada (D8). */
export function getNextPractice(): Promise<EnglishPractice> {
  return getJson<EnglishPractice>('/english/practices/next')
}

export function savePractice(payload: EnglishPracticeWrite): Promise<EnglishPracticeSaved> {
  return postJson<EnglishPracticeSaved>('/english/practices', payload)
}

export function setPracticeMastered(
  practiceId: number,
  mastered: boolean,
): Promise<EnglishPracticeSaved> {
  return patchJson<EnglishPracticeSaved>(`/english/practices/${practiceId}`, { mastered })
}

/**
 * Transcribe una grabacion del speaking (y en la lectura la compara con el
 * texto esperado). Gasta tokens: queda registrado en el backend.
 */
export function transcribeSpeech(input: {
  audio: Blob
  mimeType: string
  contentId: number
  phase: 'reading' | 'free'
  seconds: number
}): Promise<EnglishSpeechResult> {
  const form = new FormData()
  const extension = input.mimeType.includes('mp4')
    ? 'mp4'
    : input.mimeType.includes('ogg')
      ? 'ogg'
      : 'webm'
  form.append('audio', input.audio, `speech.${extension}`)
  form.append('content_id', String(input.contentId))
  form.append('phase', input.phase)
  form.append('duration_seconds', input.seconds.toFixed(1))
  return postForm<EnglishSpeechResult>('/english/speech', form)
}

/** Feedback de la practica (1 llamada al LLM; si ya existe, el guardado sin costo). */
export function requestFeedback(practiceId: number): Promise<EnglishFeedback> {
  return postJson<EnglishFeedback>(`/english/practices/${practiceId}/feedback`, {})
}

/** Fase 1 del writing: compara el dictado con la frase escuchada. No guarda nada. */
export function checkDictation(contentId: number, text: string): Promise<EnglishDictationResult> {
  return postJson<EnglishDictationResult>('/english/dictation/check', {
    content_id: contentId,
    text,
  })
}
