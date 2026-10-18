import { getJson, patchJson, postJson, putJson } from '@/lib/http'
import type {
  EnglishLevel,
  EnglishPractice,
  EnglishPracticeSaved,
  EnglishPracticeWrite,
  EnglishSettings,
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
