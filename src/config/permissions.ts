// Permisos de dominio, mismo catalogo que ulm-core (app/services/permissions.py).
// El front solo los usa para mostrar u ocultar: quien decide es el backend,
// que responde 403 a cualquier ruta de un modulo sin permiso.
export type Permission =
  | 'weight'
  | 'weight.ai'
  | 'meals'
  | 'meals.ai'
  | 'finances'
  | 'finances.ai'
  | 'planning'
  | 'planning.ai'
  | 'blog'

/**
 * Lo que exige una ruta, un item del menu o un tipo de registro. Una lista
 * significa "cualquiera de": una pantalla con tipos de varios dominios (ej.
 * "View records") se muestra si el usuario tiene al menos uno, y adentro filtra.
 */
export type PermissionRequirement = Permission | readonly Permission[]

export type PermissionDomain = 'weight' | 'meals' | 'finances' | 'planning' | 'blog'

/**
 * Dominios con su permiso base y su avanzado (`.ai`), para la pantalla de
 * administracion de usuarios (Settings -> Users). Si el backend agrega un
 * dominio que no esta aca, solo falta su fila: el backend valida igual. Sin
 * `ai`, el dominio no tiene avanzado (blog).
 */
export const PERMISSION_DOMAINS: readonly {
  id: PermissionDomain
  label: string
  description: string
  ai?: Permission
}[] = [
  { id: 'weight', label: 'Weight', description: 'Weight records and trend', ai: 'weight.ai' },
  { id: 'meals', label: 'Meals', description: 'Meal records', ai: 'meals.ai' },
  {
    id: 'finances',
    label: 'Finances',
    description: 'Expenses, incomes, tags and analysis',
    ai: 'finances.ai',
  },
  {
    id: 'planning',
    label: 'Planning',
    description: 'Checklists and calendar',
    ai: 'planning.ai',
  },
  { id: 'blog', label: 'Blog', description: 'Public blog at /blog/<username>' },
]

/** Union sin repetidos de los permisos de `items` (los que no piden ninguno no suman). */
export function anyPermissionOf(items: readonly { permission?: Permission }[]): Permission[] {
  return [...new Set(items.flatMap((item) => (item.permission ? [item.permission] : [])))]
}
