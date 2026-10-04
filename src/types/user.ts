import type { Permission } from '@/config/permissions'

// Usuario logueado, tal como lo devuelve GET /me (ulm-core app/schemas/user.py).
export interface Me {
  id: number
  name: string
  email: string
  avatar_url: string | null
  timezone: string
  // Nulo hasta que el usuario lo crea (Settings -> General). URL de su blog.
  username: string | null
  is_admin: boolean
  // Efectivos: todos si es admin. Ver src/config/permissions.ts.
  permissions: Permission[]
}
