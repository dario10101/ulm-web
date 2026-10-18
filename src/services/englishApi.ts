import { getJson, patchJson, postForm, postJson, putJson } from '@/lib/http'
import type {
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
