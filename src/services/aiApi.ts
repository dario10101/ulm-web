import { getJson, postJson } from '@/lib/http'
import type { AiAnswer, AiModels } from '@/types/ai'

/** Modelos elegibles (catalogo del backend filtrado por la key) y el preseleccionado. */
export function getAiModels(): Promise<AiModels> {
  return getJson<AiModels>('/ai/models')
}

/** Pregunta suelta, sin contexto: cada llamada es independiente. Sin `model`, el default. */
export function askAi(question: string, model?: string): Promise<AiAnswer> {
  return postJson<AiAnswer>('/ai/ask', { question, model })
}
