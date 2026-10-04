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

/**
 * Lo que exige una ruta, un item del menu o un tipo de registro. Una lista
 * significa "cualquiera de": una pantalla con tipos de varios dominios (ej.
 * "View records") se muestra si el usuario tiene al menos uno, y adentro filtra.
 */
export type PermissionRequirement = Permission | readonly Permission[]

/** Union sin repetidos de los permisos de `items` (los que no piden ninguno no suman). */
export function anyPermissionOf(items: readonly { permission?: Permission }[]): Permission[] {
  return [...new Set(items.flatMap((item) => (item.permission ? [item.permission] : [])))]
}
