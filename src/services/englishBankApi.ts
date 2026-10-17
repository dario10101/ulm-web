import { getJson, patchJson, postJson } from '@/lib/http'
import type {
  EnglishFillProgress,
  EnglishLevel,
  EnglishLevelBank,
  EnglishWordAdmin,
  EnglishWordPage,
  EnglishWordStatus,
} from '@/types/english'

// Banco compartido de ingles (solo admin). El llenado lo encadena el front:
// importar y despues procesar lotes hasta remaining = 0 (ENGLISH-TEACHER-PLAN.md, 5.1).

export function listBankLevels(): Promise<EnglishLevelBank[]> {
  return getJson<EnglishLevelBank[]>('/system/english/levels')
}

export function importBankWords(level: EnglishLevel): Promise<{ added: number }> {
  return postJson<{ added: number }>(`/system/english/levels/${level}/import`, {})
}

export function processBankBatch(level: EnglishLevel): Promise<EnglishFillProgress> {
  return postJson<EnglishFillProgress>(`/system/english/levels/${level}/process`, {})
}

export function listBankWords(
  level: EnglishLevel,
  options: { status?: EnglishWordStatus | null; offset?: number; limit?: number } = {},
): Promise<EnglishWordPage> {
  const params = new URLSearchParams({ level })
  if (options.status) params.set('status', options.status)
  if (options.offset) params.set('offset', String(options.offset))
  if (options.limit) params.set('limit', String(options.limit))
  return getJson<EnglishWordPage>(`/system/english/words?${params}`)
}

export function nextBankImage(wordId: number): Promise<EnglishWordAdmin> {
  return postJson<EnglishWordAdmin>(`/system/english/words/${wordId}/next-image`, {})
}

export function setBankWordStatus(
  wordId: number,
  status: 'APPROVED' | 'DISABLED',
): Promise<EnglishWordAdmin> {
  return patchJson<EnglishWordAdmin>(`/system/english/words/${wordId}`, { status })
}
