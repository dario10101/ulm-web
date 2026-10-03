import { API_BASE_URL } from '@/config/env'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestOptions {
  /** No llamar al handler de 401 (para preguntar si hay sesion sin redirigir). */
  skipUnauthorizedHandler?: boolean
}

// Que hacer cuando la API responde 401 (la sesion vencio o se cerro en otro
// lado). Lo registra el router (router/authGuard.ts): este modulo no conoce
// el router, asi no hay import circular y se puede testear solo.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) {
      // Errores de validacion de FastAPI/Pydantic: [{ loc, msg, type }, ...]
      return body.detail.map((issue: { msg: string }) => issue.msg).join(', ')
    }
  } catch {
    // El cuerpo no era JSON, se usa el mensaje generico de abajo
  }
  return `Error de la API (${response.status})`
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  // Sin `credentials`: la API es del mismo origen (proxy de Vite en desarrollo,
  // mismo dominio en produccion), y en ese caso fetch ya manda la cookie.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (response.status === 401 && !options.skipUnauthorizedHandler) {
    onUnauthorized?.()
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, undefined, options)
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function deleteJson<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}
