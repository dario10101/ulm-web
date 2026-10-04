import type { Permission } from '@/config/permissions'
import { getJson, postJson, putJson } from '@/lib/http'
import type { AdminUser, InviteUserPayload } from '@/types/adminUsers'

// Administracion de usuarios (solo admin): el backend responde 403 a cualquier otro.

export function listUsers(): Promise<AdminUser[]> {
  return getJson<AdminUser[]>('/admin/users')
}

export function inviteUser(payload: InviteUserPayload): Promise<AdminUser> {
  return postJson<AdminUser>('/admin/users', payload)
}

/** Reemplaza el conjunto completo: lo que no venga se quita. */
export function setUserPermissions(id: number, permissions: Permission[]): Promise<AdminUser> {
  return putJson<AdminUser>(`/admin/users/${id}/permissions`, { permissions })
}

export function disableUser(id: number): Promise<AdminUser> {
  return postJson<AdminUser>(`/admin/users/${id}/disable`, {})
}

export function enableUser(id: number): Promise<AdminUser> {
  return postJson<AdminUser>(`/admin/users/${id}/enable`, {})
}
