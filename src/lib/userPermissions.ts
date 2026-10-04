import { PERMISSION_DOMAINS, type Permission, type PermissionDomain } from '@/config/permissions'

/**
 * Reglas de la matriz de permisos (Settings -> Users), las mismas que valida
 * el backend: el `.ai` de un dominio exige su base, asi que quitar el base
 * quita tambien el `.ai`. Funciones puras: reciben y devuelven la lista.
 */

function aiOf(domain: PermissionDomain): Permission {
  return PERMISSION_DOMAINS.find((d) => d.id === domain)!.ai
}

export function setDomainAccess(
  permissions: readonly Permission[],
  domain: PermissionDomain,
  on: boolean,
): Permission[] {
  const rest = permissions.filter((p) => p !== domain && p !== aiOf(domain))
  return on ? [...rest, domain] : rest
}

export function setDomainAi(
  permissions: readonly Permission[],
  domain: PermissionDomain,
  on: boolean,
): Permission[] {
  const rest = permissions.filter((p) => p !== aiOf(domain))
  return on && permissions.includes(domain) ? [...rest, aiOf(domain)] : rest
}

/** "Finances · Planning (AI)", en el orden de PERMISSION_DOMAINS. */
export function domainSummary(permissions: readonly Permission[]): string {
  return PERMISSION_DOMAINS.filter((d) => permissions.includes(d.id))
    .map((d) => (permissions.includes(d.ai) ? `${d.label} (AI)` : d.label))
    .join(' · ')
}
