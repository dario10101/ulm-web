/**
 * Las opciones de los formularios traen solo items activos (ENABLED). Al
 * editar un registro viejo, el item que ya tiene puede estar archivado: se
 * agrega al final para que siga apareciendo seleccionado (el backend acepta
 * conservarlo en un update; lo que no acepta es usarlo en un alta).
 */
export function withCurrent<T extends { id: number }>(
  options: readonly T[],
  current: readonly T[],
): T[] {
  const ids = new Set(options.map((option) => option.id))
  return [...options, ...current.filter((item) => !ids.has(item.id))]
}
