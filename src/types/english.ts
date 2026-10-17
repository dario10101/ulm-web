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
