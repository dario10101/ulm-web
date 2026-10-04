import type { Permission } from '@/config/permissions'

// Usuario logueado, tal como lo devuelve GET /me (ulm-core app/schemas/user.py).
export interface Me {
  id: number
  name: string
  email: string
  avatar_url: string | null
  timezone: string
  is_admin: boolean
  // Efectivos: todos si es admin. Ver src/config/permissions.ts.
  permissions: Permission[]
}
