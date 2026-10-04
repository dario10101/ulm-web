import type { Permission } from '@/config/permissions'

// Usuario visto por el admin (GET /admin/users, ulm-core app/schemas/user.py).
export type UserStatus = 'invited' | 'active' | 'disabled'

export interface AdminUser {
  id: number
  name: string
  email: string
  avatar_url: string | null
  // invited: todavia no entro nunca (la invitacion se vincula en su primer login).
  status: UserStatus
  // Admin por ADMIN_EMAILS: tiene todo y no se edita.
  is_admin: boolean
  // Efectivos: todos si es admin.
  permissions: Permission[]
  created_at: string
  last_login_at: string | null
}

export interface InviteUserPayload {
  email: string
  name: string | null
}
