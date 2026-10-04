import { vi } from 'vitest'

import type { Permission } from '../../src/config/permissions'

type Reply = { status: number; body?: unknown }

/**
 * Reemplaza `fetch` con respuestas por "METODO /ruta" (la ruta relativa a la
 * API, ej. "GET /me"). Lo no declarado responde 404. Devuelve el mock para
 * inspeccionar las llamadas.
 */
export function mockApi(replies: Record<string, Reply>) {
  const mock = vi.fn((input: string, init?: RequestInit) => {
    const path = input.replace(/^\/api\/v1/, '').split('?')[0]
    const reply = replies[`${init?.method ?? 'GET'} ${path}`] ?? { status: 404 }
    return Promise.resolve({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: () => Promise.resolve(reply.body ?? {}),
    })
  })
  global.fetch = mock as unknown as typeof fetch
  return mock
}

export const ME = {
  id: 1,
  name: 'Ruben Dorado',
  email: 'ruben.d21pc@gmail.com',
  avatar_url: 'https://lh3.googleusercontent.com/a/photo',
  timezone: 'America/Bogota',
  username: null as string | null,
  is_admin: false,
  permissions: [] as Permission[],
}

/** Usuario con todos los permisos de dominio (como el admin). */
export const ME_ALL = {
  ...ME,
  is_admin: true,
  permissions: [
    'blog',
    'finances',
    'finances.ai',
    'meals',
    'meals.ai',
    'planning',
    'planning.ai',
    'weight',
    'weight.ai',
  ] as Permission[],
}
