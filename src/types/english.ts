// Modulo English (ulm-core app/schemas/english.py). Ver ENGLISH-TEACHER-PLAN.md.

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const ENGLISH_LEVELS: readonly EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// --- Banco (admin, Settings -> System -> English bank) ---

export type EnglishWordStatus = 'PENDING' | 'APPROVED' | 'REVIEW' | 'DISABLED'

export interface EnglishLevelBank {
  level: EnglishLevel
  /** Palabras del nivel en la lista, despues de filtrar. */
  list_total: number
  imported: number
  approved: number
  review: number
  pending: number
  disabled: number
  /** Las que tocaria un llenado (pendientes o en revision con reintentos). */
  processable: number
  /** No quedan palabras por importar ni por procesar. */
  full: boolean
}

export interface EnglishFillProgress {
  processed: number
  approved: number
  sent_to_review: number
  remaining: number
}

export interface EnglishImage {
  url: string
  source: string
  license: string
  /** Credito que exige la licencia: se muestra con la imagen. */
  attribution: string
  page_url: string | null
}

export interface EnglishWordAdmin {
  id: number
  lemma: string
  pos: string
  level: EnglishLevel
  status: EnglishWordStatus
  status_reason: string | null
  accepted_answers: string[]
  image: EnglishImage | null
  has_content: boolean
}

export interface EnglishWordPage {
  items: EnglishWordAdmin[]
  total: number
}

// --- Practica (/english) ---

export interface EnglishLevelAvailability {
  level: EnglishLevel
  ready_words: number
  /** Con banco suficiente para elegirlo. */
  available: boolean
}

export interface EnglishSettings {
  /** Nulo hasta que el usuario elige su nivel. */
  level: EnglishLevel | null
  levels: EnglishLevelAvailability[]
  /** Ya domina todas las palabras de su nivel: se repiten (D19). */
  level_completed: boolean
}

export interface EnglishLevelConfig {
  first_letter_hint: boolean
  tts_rate: number
  writing_min_chars: number
  free_speaking_seconds: number
  /** 'es' en A1-A2: instrucciones en español. */
  instructions_lang: 'es' | 'en'
}

/** Todo lo de una practica, incluida la respuesta (la validacion es del front, D10). */
export interface EnglishPractice {
  word_id: number
  content_id: number
  level: EnglishLevel
  lemma: string
  accepted_answers: string[]
  pos: string
  image: EnglishImage | null
  listening_sentence: string
  writing_prompt: string
  writing_prompt_es: string | null
  reading_text: string
  reading_question: string
  /** Palabra ya dominada que se repite: no se muestra el check (D19/D20). */
  mastered_repeat: boolean
  config: EnglishLevelConfig
}

/** La practica completa, enviada al llegar al cierre (D21). */
export interface EnglishPracticeWrite {
  word_id: number
  content_id: number
  vocab_revealed: boolean
  vocab_used_synonym: boolean
  listening_text_shown: boolean
  writing_text: string
  reading_transcript: string | null
  reading_match_pct: number | null
  free_transcript: string | null
  speaking_skipped: boolean
  audio_seconds: number
  mastered: boolean
}

export interface EnglishPracticeSaved {
  id: number
  mastered: boolean
  was_mastered: boolean
}

export interface EnglishDiffOp {
  /** equal: leida bien; missing: no la dijo; extra: de mas; changed: dijo otra. */
  kind: 'equal' | 'missing' | 'extra' | 'changed'
  expected: string[]
  said: string[]
}

export interface EnglishSpeechResult {
  transcript: string
  duration_seconds: number
  /** Solo en la lectura. */
  match_pct: number | null
  diff: EnglishDiffOp[] | null
}

export interface EnglishCorrection {
  original: string
  corrected: string
  explanation: string
}

export interface EnglishFeedback {
  summary: string
  vocabulary: string
  writing_corrections: EnglishCorrection[]
  reading_observations: string[]
  speaking_corrections: EnglishCorrection[]
  answered_question: boolean
  tips: string[]
  model: string
}
